const cloudinary  = require('../config/cloudinary');
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

// ─── Groq Vision Parser (primary — sends image directly, no Tesseract needed) ─
// Always returns an ARRAY of products (even for single-item bills).
const parseWithGroqVision = async (imageBuffer, mimeType = 'image/jpeg') => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const base64Image = imageBuffer.toString('base64');

  const prompt = `You are a bill/invoice data extractor. Look at this bill/receipt image carefully.

A bill may contain ONE or MULTIPLE products. Extract ALL line-item products separately.

Return ONLY a valid JSON array (no extra text, no markdown, no explanation).
Each element in the array represents one product:
[
  {
    "name": "full product name including model/variant (e.g. ProBook 15 Laptop Intel i7 16GB 512GB SSD Silver)",
    "brand": "brand name or null",
    "category": "one of: Electronics, Appliance, Vehicle, Furniture, Other",
    "purchaseDate": "YYYY-MM-DD format (invoice/bill date) or null",
    "purchasePrice": number (this item's unit price × qty + its proportional share of taxes) or null,
    "warrantyExpiry": "YYYY-MM-DD — calculate from purchaseDate + warranty period if shown, else null",
    "serialNumber": "serial or model number for this item or null"
  }
]

Rules:
- Extract EVERY distinct product line item as a separate object in the array
- name: full product description (e.g. "ProBook 15 Laptop (Intel i7, 16GB RAM, 512GB SSD, Silver)" not the shop name)
- purchasePrice: per-item price INCLUDING proportional tax share.
  Example: 2 items ₹65,000 + ₹25,000, subtotal ₹90,000, total tax ₹16,200 (18%):
    Item 1 = 65000 × 1.18 = 76700
    Item 2 = 25000 × 1.18 = 29500
- purchaseDate: same invoice date for all items
- warrantyExpiry: compute from purchaseDate + stated warranty period (e.g. "1 Year" + 2026-03-15 = 2027-03-15)
- serialNumber: null if not listed per-item on the bill
- If only one product on the bill, still return a single-element array
- Read all text, numbers, dates, and warranties carefully from the image`;

  const response = await groq.chat.completions.create({
    model:       'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  console.log('─── GROQ VISION RAW RESPONSE ────────────');
  console.log(raw);
  console.log('────────────────────────────────────────');

  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed  = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [parsed];
};

// ─── Groq Text Parser (fallback — uses Tesseract OCR text) ───────────────────
// Always returns an ARRAY of products.
const parseWithGroqText = async (ocrText) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a bill/invoice data extractor. Extract ALL products from the OCR text below.
The OCR text may contain errors — use context to correct them.

OCR TEXT:
"""
${ocrText}
"""

Return ONLY a valid JSON array (no extra text, no markdown, no explanation).
Each element represents one distinct product:
[
  {
    "name": "full product name including model/variant",
    "brand": "brand name or null",
    "category": "one of: Electronics, Appliance, Vehicle, Furniture, Other",
    "purchaseDate": "YYYY-MM-DD (invoice/bill date) or null",
    "purchasePrice": number (this item's price including proportional tax) or null,
    "warrantyExpiry": "YYYY-MM-DD — calculate from purchaseDate + warranty period if shown, else null",
    "serialNumber": "serial or model number or null"
  }
]

Rules:
- Extract EVERY distinct product as a separate array element
- If only one product, return a single-element array
- purchasePrice: each item's unit price × qty + proportional tax (NOT the grand total)
- warrantyExpiry: compute from purchase date + stated warranty (e.g. "1 Year" → +1 year from purchaseDate)
- OCR errors: "Ac 17" → "AC 1T", "0"/"O" confusion — fix using context`;

  const response = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    temperature: 0.1,
    messages:    [{ role: 'user', content: prompt }],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  console.log('─── GROQ TEXT RAW RESPONSE ──────────────');
  console.log(raw);
  console.log('────────────────────────────────────────');

  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed  = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [parsed];
};

// ─── Fallback regex parser (last resort — returns single-element array) ───────
const parseWithRegex = (rawText) => {
  const lines    = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = lines.join(' ');

  let purchasePrice = null, bestPrice = 0;
  for (const m of fullText.matchAll(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/g)) {
    const val = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(val) && val > bestPrice && val < 10000000) { bestPrice = val; purchasePrice = val; }
  }

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

  const brands = ['Voltas','Samsung','Apple','Sony','LG','Bosch','Whirlpool','Philips','Panasonic','Dell','HP','Lenovo','Asus','Acer','Bajaj','Havells','Godrej','Daikin','Hitachi','Toshiba','Blue Star','Lloyd','Haier'];
  const brand = brands.find(b => new RegExp(`\\b${b}\\b`, 'i').test(fullText)) || null;

  const sm = rawText.match(/(?:^|\n)\s*([A-Z0-9]{10,22})\s*(?:\n|$)/im);
  const serialNumber = sm ? sm[1].trim() : null;

  let name = null;
  if (brand) {
    const bl = lines.find(l => new RegExp(`\\b${brand}\\b`, 'i').test(l) && l.length < 100);
    if (bl) name = bl.replace(/^\d+\s+/, '').replace(/\s+\d{8,}.*$/, '').trim();
  }

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

  return [{ name, brand, category, purchaseDate, purchasePrice, warrantyExpiry: null, serialNumber }];
};

// ─── Controllers ─────────────────────────────────────────────────────────────
exports.uploadBill = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const isPdf  = req.file.mimetype === 'application/pdf';
    const folder = 'vault/bills';

    // 1. Upload to Cloudinary
    const url = await uploadToCloudinary(req.file.buffer, folder, isPdf ? 'raw' : 'image');

    // ocr is now always an ARRAY (or null for PDFs)
    let ocr = null;

    if (!isPdf) {
      if (process.env.GROQ_API_KEY) {
        // 2a. Try Groq Vision first (reads image directly — most accurate)
        try {
          console.log('─── OCR: Trying Groq Vision ────────────');
          ocr = await parseWithGroqVision(req.file.buffer, req.file.mimetype);
          console.log('─── GROQ VISION PARSED FIELDS ──────────');
        } catch (visionErr) {
          console.warn('Groq Vision failed, falling back to Tesseract + Groq text:', visionErr.message);

          // 2b. Tesseract OCR + Groq text
          try {
            const Tesseract = require('tesseract.js');
            const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng', { logger: () => {} });
            console.log('─── TESSERACT OCR TEXT ──────────────────');
            console.log(text);

            try {
              ocr = await parseWithGroqText(text);
              console.log('─── GROQ TEXT PARSED FIELDS ─────────────');
            } catch (groqTextErr) {
              console.warn('Groq text parsing failed, falling back to regex:', groqTextErr.message);
              ocr = parseWithRegex(text);
              console.log('─── REGEX PARSED FIELDS (last resort) ───');
            }
          } catch (tesseractErr) {
            console.warn('Tesseract failed too:', tesseractErr.message);
            ocr = [{ name: null, brand: null, category: 'Other', purchaseDate: null, purchasePrice: null, warrantyExpiry: null, serialNumber: null }];
          }
        }
      } else {
        console.warn('GROQ_API_KEY not set — using Tesseract + regex parser');
        const Tesseract = require('tesseract.js');
        const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng', { logger: () => {} });
        console.log('─── TESSERACT OCR TEXT ──────────────────');
        console.log(text);
        ocr = parseWithRegex(text);
        console.log('─── REGEX PARSED FIELDS ─────────────────');
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