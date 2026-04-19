/**
 * server/jobs/warrantyChecker.job.js
 *
 * THE only warranty cron job — replaces both warrantyExpiry.job.js AND the old
 * warrantyChecker.job.js (which had a bug: looked up products by `owner` field
 * instead of VaultMember, so it missed most products).
 *
 * What it does every day at 08:00 AM IST:
 *   1. Finds products whose warrantyExpiry falls exactly N days from today,
 *      where N comes from each vault-member user's notificationPrefs.daysBefore.
 *   2. Creates an in-app Notification document (deduped per user/product/day).
 *   3. Emits a Socket.IO event to the user's personal room so the Notifications
 *      page updates in real-time without a page refresh.
 *   4. Fires the email via Notification.service.js (respects user toggles).
 *
 * Usage in server.js (call ONCE after DB connects):
 *   const { startWarrantyChecker } = require('./jobs/warrantyChecker.job');
 *   startWarrantyChecker(io);   // pass the Socket.IO server instance
 *
 * To trigger immediately for testing (e.g. from a route):
 *   const { runWarrantyCheck } = require('./jobs/warrantyChecker.job');
 *   await runWarrantyCheck(io);
 */

const cron                      = require('node-cron');
const Product                   = require('../models/Product');
const User                      = require('../models/User');
const VaultMember               = require('../models/VaultMember');
const Notification              = require('../models/Notification');
const { dispatchWarrantyAlert } = require('../services/Notification.service');

// Default alert windows if a user hasn't configured custom ones
const DEFAULT_DAYS_BEFORE = [7, 30];

// ─── Core logic ───────────────────────────────────────────────────────────────
const runWarrantyCheck = async (io) => {
  console.log('[warrantyChecker] ▶ Running warranty check…');
  const now = new Date();

  try {
    // Collect all unique daysBefore values across all users
    const allUsers      = await User.find({}, 'notificationPrefs email name');
    const allDaysValues = new Set(DEFAULT_DAYS_BEFORE);
    for (const u of allUsers) {
      const days = u.notificationPrefs?.daysBefore;
      if (Array.isArray(days) && days.length) days.forEach(d => allDaysValues.add(d));
    }

    let totalNotified = 0;

    for (const offsetDays of allDaysValues) {
      // Build the full-day window for the target date
      const target = new Date(now);
      target.setDate(now.getDate() + offsetDays);
      const dayStart = new Date(target); dayStart.setHours(0,  0,  0,   0);
      const dayEnd   = new Date(target); dayEnd.setHours(23, 59, 59, 999);

      // Find all products expiring on that exact day
      const products = await Product.find({
        warrantyExpiry: { $gte: dayStart, $lte: dayEnd },
      });

      if (!products.length) continue;

      for (const product of products) {
        // Find all vault members who have access to this product's vault
        const members = await VaultMember.find({ vaultId: product.vaultId });

        for (const member of members) {
          const user = allUsers.find(u => String(u._id) === String(member.userId));
          if (!user) continue;

          // Check this offset is in the user's personal daysBefore list
          const userDays = (Array.isArray(user.notificationPrefs?.daysBefore) && user.notificationPrefs.daysBefore.length)
            ? user.notificationPrefs.daysBefore
            : DEFAULT_DAYS_BEFORE;
          if (!userDays.includes(offsetDays)) continue;

          // ── Deduplicate: one notification per user/product/daysLeft per day ──
          const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
          const already = await Notification.findOne({
            userId:    member.userId,
            productId: product._id,
            type:      'warranty_expiring',
            createdAt: { $gte: todayStart },
          });
          if (already) {
            console.log(`[warrantyChecker] Already notified user ${member.userId} for "${product.name}" (${offsetDays}d) — skip`);
            continue;
          }

          // ── Send email + get channel audit ────────────────────────────────
          const sent = await dispatchWarrantyAlert(user, product, offsetDays);

          // ── Create in-app notification ────────────────────────────────────
          const notification = await Notification.create({
            userId:    member.userId,
            productId: product._id,
            type:      'warranty_expiring',
            message:   `"${product.name}" warranty expires in ${offsetDays} day${offsetDays !== 1 ? 's' : ''} (${new Date(product.warrantyExpiry).toDateString()}).`,
            isRead:    false,
            channels:  sent,
          });

          // ── Real-time Socket.IO push to the user's personal room ──────────
          if (io) {
            // Populate productId for the frontend
            const populated = await Notification.findById(notification._id)
              .populate('productId', 'name brand category warrantyExpiry');

            io.to(`user:${String(member.userId)}`).emit('new-notification', populated);
            console.log(`[warrantyChecker] 🔔 Socket push → room user:${member.userId}`);
          }

          totalNotified++;
          console.log(
            `[warrantyChecker] Notified user ${member.userId} for "${product.name}" ` +
            `(${offsetDays}d) | email:${sent.email}`
          );
        }
      }
    }

    console.log(`[warrantyChecker] ✓ Done — ${totalNotified} notification(s) created.`);
  } catch (err) {
    console.error('[warrantyChecker] Fatal error:', err.message);
  }
};

// ─── Scheduler ────────────────────────────────────────────────────────────────
const startWarrantyChecker = (io) => {
  // Run every day at 08:00 AM IST
  cron.schedule('0 8 * * *', () => runWarrantyCheck(io), {
    timezone: 'Asia/Kolkata',
  });
  console.log('[warrantyChecker] Scheduled: daily at 08:00 AM IST');
};

module.exports = { startWarrantyChecker, runWarrantyCheck };