const Vault = require('../models/Vault');
const VaultMember = require('../models/VaultMember');

// POST /api/vaults — create a new vault
exports.createVault = async (req, res) => {
  try {
    const { name } = req.body;
    const vault = await Vault.create({ name, ownerId: req.user._id });

    // automatically add creator as owner member
    await VaultMember.create({ vaultId: vault._id, userId: req.user._id, role: 'owner' });

    res.status(201).json(vault);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/vaults/my — get all vaults this user belongs to
exports.getMyVaults = async (req, res) => {
  try {
    const memberships = await VaultMember.find({ userId: req.user._id }).populate('vaultId');
    const vaults = memberships.map(m => ({ ...m.vaultId.toObject(), role: m.role }));
    res.json(vaults);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/vaults/:id/invite — invite a member by email
exports.inviteMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const User = require('../models/User');

    const userToInvite = await User.findOne({ email });
    if (!userToInvite) return res.status(404).json({ message: 'No user found with that email' });

    const existing = await VaultMember.findOne({ vaultId: req.params.id, userId: userToInvite._id });
    if (existing) return res.status(400).json({ message: 'User is already a member' });

    await VaultMember.create({ vaultId: req.params.id, userId: userToInvite._id, role });
    res.json({ message: 'Member invited successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// PUT /api/vaults/:id/member/:uid — change role
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/vaults/:id/member/:uid — remove member
exports.removeMember = async (req, res) => {
  try {
    await VaultMember.findOneAndDelete({
      vaultId: req.params.id,
      userId: req.params.uid
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};