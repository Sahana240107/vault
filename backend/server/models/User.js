const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // ← must be passwordHash, not password
  avatar:       { type: String },

  vaults:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vault' }],
  pushToken: { type: String },

  // ─── Notification Preferences (email only) ───────────────────────────────
  notificationPrefs: {
    emailAddr:  { type: String, default: '' }, // falls back to user.email if blank
    daysBefore: { type: [Number], default: [7, 30] },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);