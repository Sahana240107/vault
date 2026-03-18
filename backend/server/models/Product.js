const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  brand:          { type: String },
  category:       {
    type: String,
    enum: ['Electronics', 'Appliance', 'Vehicle', 'Furniture', 'Other'],
    default: 'Other',
  },
  purchaseDate:   { type: Date },
  purchasePrice:  { type: Number },
  warrantyExpiry: { type: Date },   // ← filled from bill OCR or warranty card OCR
  warrantyCardUrl:{ type: String }, // ← Cloudinary URL of separate warranty card image

  billImageUrl:   { type: String }, // ← Cloudinary URL (image bill)
  billPdfUrl:     { type: String }, // ← Cloudinary URL (PDF bill)

  serialNumber:   { type: String },
  notes:          { type: String },
  tags:           [{ type: String }],

  vaultId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Vault', required: true },
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceHistory' }],

  resaleEstimate: { type: Number },
  carbonScore:    { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);