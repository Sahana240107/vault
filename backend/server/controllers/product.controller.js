const Product = require('../models/Product');
const VaultMember = require('../models/VaultMember');

// helper — checks if user is a member of the vault
const isMember = async (vaultId, userId) => {
  const m = await VaultMember.findOne({ vaultId, userId });
  return !!m;
};

// POST /api/products — create a product
exports.createProduct = async (req, res) => {
  try {
    const { vaultId, name, brand, category, purchaseDate, purchasePrice, warrantyExpiry, serialNumber, tags, notes } = req.body;

    if (!await isMember(vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    const product = await Product.create({
      vaultId, name, brand, category,
      purchaseDate, purchasePrice, warrantyExpiry,
      serialNumber, tags, notes,
      addedByUserId: req.user._id
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/products?vaultId=xxx — list all products in a vault
exports.getProducts = async (req, res) => {
  try {
    const { vaultId } = req.query;

    if (!await isMember(vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    const products = await Product.find({ vaultId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/products/:id — get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!await isMember(product.vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/products/:id — update a product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!await isMember(product.vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/products/:id — delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!await isMember(product.vaultId, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};