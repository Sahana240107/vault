/**
 * server/controllers/product.controller.js
 *
 * On createProduct / updateProduct:
 *  - If warrantyExpiry is within any of the owner's daysBefore windows → exact match notif
 *  - If warrantyExpiry is within 30 days (active warranty nearing expiry) → immediate alert + email
 */

const Product          = require('../models/Product');
const VaultMember      = require('../models/VaultMember');
const User             = require('../models/User');
const Notification     = require('../models/Notification');
const { emitNotification } = require('../utils/socketEmitter');
const { sendEmail } = require('../services/Notification.service');

const isMember = async (vaultId, userId) => {
  const m = await VaultMember.findOne({ vaultId, userId });
  return !!m;
};

// ─── Immediately notify owner if new/updated product's warranty is expiring ──
const checkAndNotifyWarranty = async (product, io) => {
  if (!product.warrantyExpiry) return;

  const user = await User.findById(product.owner).select('notificationPrefs email name');
  if (!user) return;

  const now        = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const expiry     = new Date(product.warrantyExpiry);
  const msLeft     = expiry - now;
  const daysLeft   = Math.floor(msLeft / 86400000);

  // Already expired — skip
  if (daysLeft < 0) return;

  const daysBefore = user.notificationPrefs?.daysBefore?.length
    ? user.notificationPrefs.daysBefore
    : [7, 30];

  // ── Check 1: Exact-day match for user's configured windows (7d, 30d, etc.) ──
  for (const offsetDays of daysBefore) {
    const target     = new Date(now);
    target.setDate(target.getDate() + offsetDays);
    const startOfDay = new Date(target); startOfDay.setHours(0,  0,  0,   0);
    const endOfDay   = new Date(target); endOfDay.setHours(23, 59, 59, 999);

    if (expiry < startOfDay || expiry > endOfDay) continue;

    const alreadySent = await Notification.findOne({
      userId: product.owner, productId: product._id,
      type: 'warranty_expiring', createdAt: { $gte: todayStart },
    });
    if (alreadySent) continue;

    const notif = await Notification.create({
      userId:    product.owner,
      productId: product._id,
      type:      'warranty_expiring',
      message:   `"${product.name}" warranty expires in ${offsetDays} day${offsetDays !== 1 ? 's' : ''}.`,
      channels:  { email: false },
    });

    emitNotification(io, product.owner, notif);
    console.log(`[product] Instant warranty alert for "${product.name}" (${offsetDays}d)`);
  }

  // ── Check 2: ANY warranty within 30 days on product add/update ──────────────
  // Send an immediate notification + email alert regardless of exact day windows
  if (daysLeft <= 30) {
    const alreadySentToday = await Notification.findOne({
      userId: product.owner, productId: product._id,
      type: 'warranty_expiring', createdAt: { $gte: todayStart },
    });
    if (!alreadySentToday) {
      const urgencyLabel = daysLeft <= 7
        ? `🔴 URGENT: expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`
        : `expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${expiry.toDateString()}.`;

      // Send email alert
      let emailSent = false;
      const emailAddr = user.notificationPrefs?.emailAddr?.trim() || user.email;
      try {
        await sendEmail({
          to: emailAddr,
          productName: product.name,
          warrantyExpiry: product.warrantyExpiry,
          daysLeft,
        });
        emailSent = true;
        console.log(`[product] Warranty <30d email → ${emailAddr} for "${product.name}" (${daysLeft}d)`);
      } catch (err) {
        console.error(`[product] Email failed for "${product.name}":`, err.message);
      }

      const notif = await Notification.create({
        userId:    product.owner,
        productId: product._id,
        type:      'warranty_expiring',
        message:   `"${product.name}" warranty ${urgencyLabel}`,
        channels:  { email: emailSent },
      });

      const populated = await Notification.findById(notif._id)
        .populate('productId', 'name brand category warrantyExpiry');

      emitNotification(io, product.owner, populated);
      console.log(`[product] <30d alert created for "${product.name}" (${daysLeft}d left)`);
    }
  }
};

// ─── POST /api/products ───────────────────────────────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const {
      vaultId, name, brand, category,
      purchaseDate, purchasePrice, warrantyExpiry,
      serialNumber, tags, notes,
      billImageUrl, billPdfUrl, warrantyCardUrl,
    } = req.body;

    if (!await isMember(vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    const product = await Product.create({
      vaultId, name, brand, category,
      purchaseDate, purchasePrice, warrantyExpiry,
      serialNumber, tags, notes,
      billImageUrl, billPdfUrl, warrantyCardUrl,
      owner: req.user._id,
    });

    const io = req.app.get('io');

    // Vault real-time update (existing)
    if (io) io.to(vaultId.toString()).emit('vault-updated', { type: 'product-added', product });

    // Instant warranty expiry notification if applicable
    await checkAndNotifyWarranty(product, io);

    res.status(201).json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── GET /api/products?vaultId=&category=&brand=&warrantyStatus=&sortBy=&q= ──
exports.getProducts = async (req, res) => {
  try {
    const { vaultId, category, brand, warrantyStatus, sortBy, q } = req.query;

    if (!await isMember(vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    const filter = { vaultId };
    if (category && category !== 'All') filter.category = category;
    if (brand    && brand    !== 'All') filter.brand = new RegExp(brand, 'i');
    if (q) filter.$text = { $search: q };

    const now  = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (warrantyStatus === 'Active')   filter.warrantyExpiry = { $gt: in30 };
    if (warrantyStatus === 'Expiring') filter.warrantyExpiry = { $gte: now, $lte: in30 };
    if (warrantyStatus === 'Expired')  filter.warrantyExpiry = { $lt: now };

    const sortMap = {
      newest:       { createdAt: -1 },
      oldest:       { createdAt:  1 },
      'price-high': { purchasePrice: -1 },
      'price-low':  { purchasePrice:  1 },
      name:         { name: 1 },
      warranty:     { warrantyExpiry: 1 },
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    const products = await Product.find(filter).sort(sort);
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── GET /api/products/brands?vaultId= ───────────────────────────────────────
exports.getBrands = async (req, res) => {
  try {
    const { vaultId } = req.query;
    if (!await isMember(vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const brands = await Product.distinct('brand', { vaultId, brand: { $ne: null } });
    res.json(brands.filter(Boolean).sort());
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── GET /api/products/:id ────────────────────────────────────────────────────
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!await isMember(product.vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const member = await VaultMember.findOne({ vaultId: product.vaultId, userId: req.user._id });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'viewer') return res.status(403).json({ message: 'Viewers cannot edit products' });

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const io = req.app.get('io');

    if (io) io.to(product.vaultId.toString()).emit('vault-updated', { type: 'product-updated', product: updated });

    // Re-check warranty notification if warrantyExpiry changed
    if (req.body.warrantyExpiry) {
      await checkAndNotifyWarranty(updated, io);
    }

    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const member = await VaultMember.findOne({ vaultId: product.vaultId, userId: req.user._id });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'viewer') return res.status(403).json({ message: 'Viewers cannot delete products' });

    await product.deleteOne();
    const io = req.app.get('io');
    if (io) io.to(product.vaultId.toString()).emit('vault-updated', { type: 'product-deleted', productId: req.params.id });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};