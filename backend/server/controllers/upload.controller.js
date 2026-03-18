const cloudinary  = require('../config/cloudinary');
const Tesseract   = require('tesseract.js');
const streamifier = require('streamifier');
const Groq        = require('groq-sdk');

// ─── Cloudinary upload ───────────────────────────────────────────────────────
const uploadToCloudinary = (buffer, folder, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// ─── Groq AI Parser ──────────────────────────────────────────────────────────
const parseWithGroq = async (ocrText) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a bill/invoice data extractor. Extract product information from the OCR text below.

OCR TEXT:
"""
${ocrText}
"""

Return ONLY a valid JSON object with exactly these fields (no extra text, no markdown, no explanation):
{
  "name": "product name (the actual product being purchased, not the shop name)",
  "brand": "brand name or null",
  "category": "one of: Electronics, Appliance, Vehicle, Furniture, Other",
  "purchaseDate": "YYYY-MM-DD format or null",
  "purchasePrice": number (the final total amount paid) or null,
  "warrantyExpiry": "YYYY-MM-DD format or null",
  "serialNumber": "serial or model number or null"
}

Rules:
- name: extract the actual product (e.g. "Voltas AC 1T 123V MZQ Split" not "Erange Electronics")
- purchasePrice: use the GRAND TOTAL / final amount (e.g. 28000 not 21875 which is pre-tax)
- purchaseDate: look for invoice date, bill date, dated fields
- serialNumber: look for alphanumeric codes on their own lines below the product name
- warrantyExpiry: only if explicitly mentioned, otherwise null
- If OCR has garbled text, use context to correct obvious errors (e.g. "Ac 17" likely means "AC 1T")`;

  const response = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    temperature: 0.1, // low temp for consistent structured output
    messages:    [{ role: 'user', content: prompt }],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  console.log('─── GROQ RAW RESPONSE ──────────────────');
  console.log(raw);
  console.log('────────────────────────────────────────');

  // Strip markdown code fences if model added them
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
};

// ─── Fallback regex parser (if Groq fails) ───────────────────────────────────
const parseWithRegex = (rawText) => {
  const lines    = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = lines.join(' ');

  // Price: largest number in bill
  let purchasePrice = null, bestPrice = 0;
  for (const m of fullText.matchAll(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/g)) {
    const val = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(val) && val > bestPrice && val < 10000000) { bestPrice = val; purchasePrice = val; }
  }

  // Date
  const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December';
  let purchaseDate = null;
  for (const pat of [
    new RegExp(`\\b(\\d{1,2})[\\s\\-\\/](${MONTHS})[a-z]*[\\s\\-\\/,]*(\\d{4})\\b`, 'i'),
    /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/,
    /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/,
  ]) {
    const m = fullText.match(pat);
    if (m) { const d = new Date(m[0]); if (!isNaN(d)) { purchaseDate = d.toISOString().split('T')[0]; break; } }
  }

  // Brand
  const brands = ['Voltas','Samsung','Apple','Sony','LG','Bosch','Whirlpool','Philips','Panasonic','Dell','HP','Lenovo','Asus','Acer','Bajaj','Havells','Godrej','Daikin','Hitachi','Toshiba','Blue Star','Lloyd','Haier'];
  const brand = brands.find(b => new RegExp(`\\b${b}\\b`, 'i').test(fullText)) || null;

  // Serial
  const sm = rawText.match(/(?:^|\n)\s*([A-Z0-9]{10,22})\s*(?:\n|$)/im);
  const serialNumber = sm ? sm[1].trim() : null;

  // Name - line with brand
  let name = null;
  if (brand) {
    const bl = lines.find(l => new RegExp(`\\b${brand}\\b`, 'i').test(l) && l.length < 100);
    if (bl) name = bl.replace(/^\d+\s+/, '').replace(/\s+\d{8,}.*$/, '').trim();
  }

  // Category
  const catMap = {
    Electronics: /phone|laptop|tv|split|ac\b|air.?condition|refrigerator|fridge|inverter|monitor/i,
    Appliance:   /washing|microwave|oven|mixer|grinder|geyser|heater|fan|cooler/i,
    Vehicle:     /car|bike|motorcycle|scooter|vehicle/i,
    Furniture:   /sofa|chair|table|bed|wardrobe|cabinet/i,
  };
  let category = 'Other';
  for (const [cat, pat] of Object.entries(catMap)) {
    if (pat.test(fullText)) { category = cat; break; }
  }

  return { name, brand, category, purchaseDate, purchasePrice, warrantyExpiry: null, serialNumber };
};

// ─── Controllers ─────────────────────────────────────────────────────────────
exports.uploadBill = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const isPdf  = req.file.mimetype === 'application/pdf';
    const folder = 'vault/bills';

    // 1. Upload to Cloudinary
    const url = await uploadToCloudinary(req.file.buffer, folder, isPdf ? 'raw' : 'image');

    let ocr = null;
    if (!isPdf) {
      // 2. Run Tesseract OCR
      const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng', {
        logger: () => {},
      });

      console.log('─── OCR RAW TEXT ───────────────────────');
      console.log(text);

      // 3. Parse with Groq AI (fallback to regex if Groq fails/not configured)
      if (process.env.GROQ_API_KEY) {
        try {
          ocr = await parseWithGroq(text);
          console.log('─── GROQ PARSED FIELDS ─────────────────');
        } catch (groqErr) {
          console.warn('Groq parsing failed, falling back to regex:', groqErr.message);
          ocr = parseWithRegex(text);
          console.log('─── REGEX PARSED FIELDS (fallback) ─────');
        }
      } else {
        console.warn('GROQ_API_KEY not set — using regex parser');
        ocr = parseWithRegex(text);
        console.log('─── REGEX PARSED FIELDS ────────────────');
      }

      console.log(JSON.stringify(ocr, null, 2));
      console.log('────────────────────────────────────────');
    }

    res.status(201).json({ url, type: isPdf ? 'pdf' : 'image', ocr });
  } catch (err) {
    console.error('uploadBill error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const url = await uploadToCloudinary(req.file.buffer, 'vault/avatars', 'image');
    res.status(201).json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};