const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  type:      {
    type: String,
    enum: ['warranty_expiring', 'warranty_expired', 'geo_alert', 'vault_invite'],
    required: true
  },
  message:   { type: String, required: true },
  isRead:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);