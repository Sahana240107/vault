const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  brand:          { type: String },
  category:       {
    type: String,
    enum: ['Electronics', 'Appliance', 'Vehicle', 'Furniture', 'Other'],
    default: 'Other',
  },
  purchaseDate:   { type: Date,   default: null },
  purchasePrice:  { type: Number, default: null },
  warrantyExpiry: { type: Date,   default: null },   // filled from bill OCR or warranty card OCR
  warrantyCardUrl:{ type: String, default: null },   // Cloudinary URL of separate warranty card image
  serialNumber:   { type: String, default: null },
  billImageUrl:   { type: String, default: null },   // Cloudinary URL (image bill)
  billPdfUrl:     { type: String, default: null },   // Cloudinary URL (PDF bill)
  notes:          { type: String },
  tags:           [{ type: String }],

  vaultId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Vault', required: true },
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceHistory' }],

  resaleEstimate: { type: Number },
  carbonScore:    { type: Number },
}, { timestamps: true });

// Full-text search index across key fields
productSchema.index({ name: 'text', brand: 'text', notes: 'text' });

module.exports = mongoose.model('Product', productSchema);