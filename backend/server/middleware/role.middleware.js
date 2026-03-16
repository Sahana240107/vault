const VaultMember = require('../models/VaultMember');

// Usage: requireRole('editor') or requireRole('owner')
const requireRole = (...allowedRoles) => async (req, res, next) => {
  try {
    const vaultId = req.params.vaultId || req.body.vaultId || req.query.vaultId;
    if (!vaultId) return res.status(400).json({ message: 'Vault ID required' });

    const member = await VaultMember.findOne({ vaultId, userId: req.user._id });
    if (!member) return res.status(403).json({ message: 'Not a vault member' });

    if (!allowedRoles.includes(member.role))
      return res.status(403).json({ message: `Requires role: ${allowedRoles.join(' or ')}` });

    req.vaultRole = member.role;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = requireRole;