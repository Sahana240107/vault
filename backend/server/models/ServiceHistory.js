const mongoose = require('mongoose');

const serviceHistorySchema = new mongoose.Schema({
  productId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  loggedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  serviceDate:    { type: Date, required: true },
  description:    { type: String, required: true },
  cost:           { type: Number, default: 0 },
  providerName:   { type: String, default: null },
  receiptUrl:     { type: String, default: null },       // Cloudinary URL
}, { timestamps: true });

module.exports = mongoose.model('ServiceHistory', serviceHistorySchema);