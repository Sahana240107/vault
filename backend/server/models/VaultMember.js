const mongoose = require('mongoose');

const vaultMemberSchema = new mongoose.Schema({
  vaultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vault', required: true },
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  role:    { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
  joinedAt:{ type: Date, default: Date.now },
});

// Prevents a user from being added to the same vault twice
vaultMemberSchema.index({ vaultId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('VaultMember', vaultMemberSchema);