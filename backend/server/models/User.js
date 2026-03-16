const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  passwordHash:  { type: String, required: true },       // bcrypt hash, never plain text
  avatarUrl:     { type: String, default: null },        // Cloudinary URL
  pushToken:     { type: String, default: null },        // Firebase FCM token for push alerts
}, { timestamps: true });                                // adds createdAt + updatedAt automatically

module.exports = mongoose.model('User', userSchema);