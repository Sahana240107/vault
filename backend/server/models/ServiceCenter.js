const mongoose = require('mongoose');

const serviceCenterSchema = new mongoose.Schema({
  name:    { type: String, required: true },             // e.g. "Apple Authorised Service"
  brand:   { type: String, required: true },             // e.g. "Apple", "Samsung"
  address: { type: String, required: true },
  location: {
    type:        { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }      // [longitude, latitude]
  },
  phone:   { type: String, default: null },
});

// Required for geo queries (finding centers near a user's coordinates)
serviceCenterSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceCenter', serviceCenterSchema);