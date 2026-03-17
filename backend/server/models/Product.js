const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vaultId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Vault', required: true },
  addedByUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  name:           { type: String, required: true },
  brand:          { type: String, default: null },
  category:       {
    type: String,
    enum: ['Electronics', 'Appliance', 'Vehicle', 'Furniture', 'Other'],
    required: true
  },
  purchaseDate:   { type: Date,   default: null },
  purchasePrice:  { type: Number, default: null },
  warrantyExpiry: { type: Date,   default: null },
  serialNumber:   { type: String, default: null },
  billImageUrl:   { type: String, default: null },
  billPdfUrl:     { type: String, default: null },
  tags:           [{ type: String }],
  notes:          { type: String, default: null },
}, { timestamps: true });

productSchema.index({ name: 'text', brand: 'text', notes: 'text' });

module.exports = mongoose.model('Product', productSchema);