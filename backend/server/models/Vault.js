const mongoose = require('mongoose');

const vaultSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  healthScore: { type: Number, default: 0, min: 0, max: 100 }, // computed by your backend
}, { timestamps: true });

module.exports = mongoose.model('Vault', vaultSchema);