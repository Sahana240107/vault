/**
 * Run this from your backend folder:
 * node test_notification.js
 */

require('dotenv').config();
const mongoose     = require('mongoose');
const Notification = require('./server/models/Notification');
const User         = require('./server/models/User');

async function createTestNotification() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find specifically by your email
  const user = await User.findOne({ email: 'krithikapalani08@gmail.com' });
  if (!user) {
    console.log('❌ User not found with email: krithikapalani08@gmail.com');
    console.log('Make sure you are registered with this email in the app.');
    process.exit(1);
  }

  console.log('✅ Found user:', user.name, '|', user.email);

  // Create a test notification
  const n = await Notification.create({
    userId:    user._id,
    productId: null,
    type:      'warranty_expiring',
    message:   '⚠️ TEST: Warranty for "Voltas AC 1T 123V MZQ Split" expires in 7 days (25 Mar 2026).',
    isRead:    false,
    channels:  { email: false },
  });

  console.log('✅ Test notification created! ID:', n._id);
  console.log('👉 Now refresh your Notifications page — it should appear.');
  process.exit(0);
}

createTestNotification().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});