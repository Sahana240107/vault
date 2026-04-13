/**
 * server/jobs/warrantyChecker.job.js
 *
 * Runs daily at 9 AM. Finds products whose warranty expires in
 * exactly N days (per each user's notificationPrefs.daysBefore),
 * creates a Notification doc, and dispatches the email.
 *
 * Usage in server.js / app.js (after DB connects):
 *   const { startWarrantyChecker } = require('./jobs/warrantyChecker.job');
 *   startWarrantyChecker();
 *
 * To test immediately without waiting for 9 AM, also export runWarrantyCheck:
 *   const { runWarrantyCheck } = require('./jobs/warrantyChecker.job');
 *   runWarrantyCheck();
 */

const cron             = require('node-cron');
const Product          = require('../models/Product');
const User             = require('../models/User');
const Notification     = require('../models/Notification');
const { dispatchWarrantyAlert } = require('../services/Notification.service');

// ─── Core logic ───────────────────────────────────────────────────────────────
const runWarrantyCheck = async () => {
  console.log('[warrantyChecker] Running warranty check...');

  try {
    // Fetch all users that have at least one daysBefore value configured
    const users = await User.find({
      'notificationPrefs.daysBefore': { $exists: true, $not: { $size: 0 } },
    });

    console.log(`[warrantyChecker] Checking ${users.length} user(s)...`);

    for (const user of users) {
      const daysBefore = user.notificationPrefs?.daysBefore || [30, 7, 1];

      for (const daysLeft of daysBefore) {
        // Build a full-day window for the target expiry date
        const now        = new Date();
        const target     = new Date(now);
        target.setDate(target.getDate() + daysLeft);

        const startOfDay = new Date(target);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(target);
        endOfDay.setHours(23, 59, 59, 999);

        // Find this user's products expiring on that exact day
        const products = await Product.find({
          owner:          user._id,
          warrantyExpiry: { $gte: startOfDay, $lte: endOfDay },
        });

        for (const product of products) {
          // Deduplicate: skip if we already sent a notification today for this product
          const alreadySent = await Notification.findOne({
            userId:    user._id,
            productId: product._id,
            type:      'warranty_expiring',
            createdAt: { $gte: startOfDay, $lte: endOfDay },
          });

          if (alreadySent) {
            console.log(`[warrantyChecker] Already notified user ${user._id} for "${product.name}" (${daysLeft}d) — skipping`);
            continue;
          }

          // Create in-app notification record
          await Notification.create({
            userId:    user._id,
            productId: product._id,
            type:      'warranty_expiring',
            message:   `"${product.name}" warranty expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
            channels:  { email: true },
          });

          // Fire the email
          const sent = await dispatchWarrantyAlert(user, product, daysLeft);
          console.log(`[warrantyChecker] Dispatched for "${product.name}" → email:${sent.email}`);
        }
      }
    }

    console.log('[warrantyChecker] Done ✓');
  } catch (err) {
    console.error('[warrantyChecker] Fatal error:', err.message);
  }
};

// ─── Scheduler ────────────────────────────────────────────────────────────────
const startWarrantyChecker = () => {
  // Runs every day at 9:00 AM server time
  cron.schedule('0 9 * * *', runWarrantyCheck, {
    timezone: 'Asia/Kolkata', // ← change to your server timezone if needed
  });
  console.log('[warrantyChecker] Scheduled: daily at 09:00 AM IST');
};

module.exports = { startWarrantyChecker, runWarrantyCheck };
