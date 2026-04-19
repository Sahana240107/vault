const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar:       { type: String },

  vaults:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vault' }],
  pushToken: { type: String },

  // ─── Notification Preferences ────────────────────────────────────────
  notificationPrefs: {
    emailAddr:  { type: String, default: '' },
    daysBefore: { type: [Number], default: [7, 30] },
    toggles: {
      warrantyAlerts: { type: Boolean, default: true },
      geoAlerts:      { type: Boolean, default: true },
      vaultActivity:  { type: Boolean, default: true },
      scanSummaries:  { type: Boolean, default: false },
      weeklyDigest:   { type: Boolean, default: true },
    },
  },

  // ─── Login Sessions (one entry per device / login) ───────────────────
  sessions: [{
    jti:       { type: String, required: true },   // unique session ID embedded in JWT
    userAgent: { type: String, default: 'Unknown' },
    ip:        { type: String, default: 'Unknown' },
    createdAt: { type: Date,   default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);