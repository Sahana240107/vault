const Vault       = require('../models/Vault');
const VaultMember = require('../models/VaultMember');

// POST /api/vaults
exports.createVault = async (req, res) => {
  try {
    const { name } = req.body;
    const vault = await Vault.create({ name, ownerId: req.user._id });
    await VaultMember.create({ vaultId: vault._id, userId: req.user._id, role: 'owner' });
    res.status(201).json(vault);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/vaults/my
exports.getMyVaults = async (req, res) => {
  try {
    const Product        = require('../models/Product');
    const ServiceHistory = require('../models/ServiceHistory');

    const memberships = await VaultMember.find({ userId: req.user._id }).populate('vaultId');

    const vaults = await Promise.all(
      memberships
        .filter(m => m.vaultId)
        .map(async (m) => {
          const vaultObj = m.vaultId.toObject();
          const products = await Product.find({ vaultId: vaultObj._id });
          const total    = products.length;

          if (total === 0) {
            return { ...vaultObj, role: m.role, healthScore: 0, productCount: 0 };
          }

          const withBill     = products.filter(p => p.billImageUrl || p.billPdfUrl).length;
          const withWarranty = products.filter(p => p.warrantyExpiry).length;
          const withSerial   = products.filter(p => p.serialNumber).length;
          const withCategory = products.filter(p => p.category).length;

          const productIds     = products.map(p => p._id);
          const serviceEntries = await ServiceHistory.find({ productId: { $in: productIds } });
          const withService    = new Set(serviceEntries.map(e => e.productId.toString())).size;

          const score = Math.round(
            (withBill     / total) * 30 +
            (withWarranty / total) * 25 +
            (withSerial   / total) * 15 +
            (withService  / total) * 15 +
            (withCategory / total) * 15
          );

          await Vault.findByIdAndUpdate(vaultObj._id, { healthScore: score });

          return { ...vaultObj, role: m.role, healthScore: score, productCount: total };
        })
    );

    res.json(vaults);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/vaults/:id/members
exports.getMembers = async (req, res) => {
  try {
    const members = await VaultMember.find({ vaultId: req.params.id })
      .populate('userId', 'name email avatarUrl');
    res.json(members);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/vaults/:id/invite
exports.inviteMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const User = require('../models/User');
    const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToInvite)
      return res.status(404).json({ message: 'No user found with that email. They must register first.' });

    const existing = await VaultMember.findOne({ vaultId: req.params.id, userId: userToInvite._id });
    if (existing)
      return res.status(400).json({ message: 'User is already a member of this vault' });

    await VaultMember.create({ vaultId: req.params.id, userId: userToInvite._id, role });

    // Notify the invited user's socket in real time
    const io = req.app.get('io');
    if (io) {
      io.emit('vault-invite', {
        userId:  userToInvite._id.toString(),
        vaultId: req.params.id,
      });
    }

    res.json({ message: 'Member invited successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/vaults/:id/member/:uid
exports.changeMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const membership = await VaultMember.findOneAndUpdate(
      { vaultId: req.params.id, userId: req.params.uid },
      { role },
      { new: true }
    );
    if (!membership) return res.status(404).json({ message: 'Member not found' });
    res.json(membership);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/vaults/:id/member/:uid
exports.removeMember = async (req, res) => {
  try {
    await VaultMember.findOneAndDelete({ vaultId: req.params.id, userId: req.params.uid });
    res.json({ message: 'Member removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/vaults/:id
exports.deleteVault = async (req, res) => {
  try {
    const vault = await Vault.findById(req.params.id);
    if (!vault) return res.status(404).json({ message: 'Vault not found' });
    if (vault.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the vault owner can delete it' });

    const Product        = require('../models/Product');
    const ServiceHistory = require('../models/ServiceHistory');

    const products   = await Product.find({ vaultId: req.params.id });
    const productIds = products.map(p => p._id);

    await ServiceHistory.deleteMany({ productId: { $in: productIds } });
    await Product.deleteMany({ vaultId: req.params.id });
    await VaultMember.deleteMany({ vaultId: req.params.id });
    await vault.deleteOne();

    res.json({ message: 'Vault deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};