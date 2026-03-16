const ServiceHistory = require('../models/ServiceHistory');
const Product = require('../models/Product');
const VaultMember = require('../models/VaultMember');

// POST /api/products/:id/service — add a service entry
exports.addServiceEntry = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const member = await VaultMember.findOne({ vaultId: product.vaultId, userId: req.user._id });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'viewer') return res.status(403).json({ message: 'Viewers cannot add service entries' });

    const { serviceDate, description, cost, providerName, receiptUrl } = req.body;

    const entry = await ServiceHistory.create({
      productId: product._id,
      loggedByUserId: req.user._id,
      serviceDate,
      description,
      cost,
      providerName,
      receiptUrl
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/products/:id/service — get all service entries for a product
exports.getServiceEntries = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const member = await VaultMember.findOne({ vaultId: product.vaultId, userId: req.user._id });
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const entries = await ServiceHistory.find({ productId: req.params.id }).sort({ serviceDate: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/products/:id/service/:entryId — delete a service entry
exports.deleteServiceEntry = async (req, res) => {
  try {
    const entry = await ServiceHistory.findById(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    if (entry.loggedByUserId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the person who logged this can delete it' });

    await entry.deleteOne();
    res.json({ message: 'Service entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};