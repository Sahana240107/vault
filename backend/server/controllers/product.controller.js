const Product     = require('../models/Product');
const VaultMember = require('../models/VaultMember');

const isMember = async (vaultId, userId) => {
  const m = await VaultMember.findOne({ vaultId, userId });
  return !!m;
};

// POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const {
      vaultId, name, brand, category,
      purchaseDate, purchasePrice, warrantyExpiry,
      serialNumber, tags, notes,
      billImageUrl, billPdfUrl,
      warrantyCardUrl,   // ← THIS WAS MISSING — now saved to DB
    } = req.body;

    if (!await isMember(vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    const product = await Product.create({
      vaultId, name, brand, category,
      purchaseDate, purchasePrice, warrantyExpiry,
      serialNumber, tags, notes,
      billImageUrl, billPdfUrl,
      warrantyCardUrl,   // ← saved
      owner: req.user._id,
    });

    const io = req.app.get('io');
    if (io) io.to(vaultId.toString()).emit('vault-updated', { type: 'product-added', product });

    res.status(201).json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/products?vaultId=&category=&brand=&warrantyStatus=&sortBy=&q=
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

// GET /api/products/brands?vaultId=
exports.getBrands = async (req, res) => {
  try {
    const { vaultId } = req.query;
    if (!await isMember(vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const brands = await Product.distinct('brand', { vaultId, brand: { $ne: null } });
    res.json(brands.filter(Boolean).sort());
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/products/:id
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!await isMember(product.vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/products/:id
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
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/products/:id
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