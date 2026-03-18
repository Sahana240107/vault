/**
 * server/jobs/warrantyExpiry.job.js
 *
 * Runs every day at 08:00 AM.
 * Checks products whose warranty expires in exactly N days (per each user's prefs).
 * Creates an in-app Notification and dispatches Email / WhatsApp / SMS per user prefs.
 */

const cron                   = require('node-cron');
const Product                = require('../models/Product');
const Notification           = require('../models/Notification');
const User                   = require('../models/User');
const VaultMember            = require('../models/VaultMember');
const { dispatchWarrantyAlert } = require('../services/notification.service');

// Default windows to check if a user hasn't configured custom ones
const DEFAULT_DAYS_BEFORE = [7, 30];

const startWarrantyCron = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running warranty expiry scan...');
    const now = new Date();

    /**
     * Build a date window for "exactly offsetDays from today"
     */
    const dayRange = (offsetDays) => {
      const target = new Date(now);
      target.setDate(now.getDate() + offsetDays);
      const start = new Date(target); start.setHours(0,  0,  0,   0);
      const end   = new Date(target); end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    try {
      // Collect all unique daysBefore values across ALL users
      const users         = await User.find({}, 'notificationPrefs email name');
      const allDaysValues = new Set(DEFAULT_DAYS_BEFORE);
      for (const u of users) {
        const days = u.notificationPrefs?.daysBefore;
        if (Array.isArray(days)) days.forEach(d => allDaysValues.add(d));
      }

      // For each offset window, find products expiring on that day
      for (const offsetDays of allDaysValues) {
        const { start, end } = dayRange(offsetDays);

        const products = await Product.find({
          warrantyExpiry: { $gte: start, $lte: end },
        });

        for (const product of products) {
          const members = await VaultMember.find({ vaultId: product.vaultId });

          for (const m of members) {
            // Find the full user document (with prefs)
            const user = users.find(u => String(u._id) === String(m.userId));
            if (!user) continue;

            // Check if user has this offset in their prefs (or use defaults)
            const userDays = user.notificationPrefs?.daysBefore?.length
              ? user.notificationPrefs.daysBefore
              : DEFAULT_DAYS_BEFORE;
            if (!userDays.includes(offsetDays)) continue;

            // Deduplicate: only one notification per user/product/day
            const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
            const exists = await Notification.findOne({
              userId:    m.userId,
              productId: product._id,
              type:      'warranty_expiring',
              createdAt: { $gte: todayStart },
            });
            if (exists) continue;

            // Dispatch across all user-enabled channels
            const sent = await dispatchWarrantyAlert(user, product, offsetDays);

            // Save in-app notification with channel audit
            await Notification.create({
              userId:    m.userId,
              productId: product._id,
              type:      'warranty_expiring',
              message:   `Warranty for "${product.name}" expires in ${offsetDays} days (${new Date(product.warrantyExpiry).toDateString()}).`,
              isRead:    false,
              channels:  sent,
            });

            console.log(
              `[cron] Notified user ${m.userId} about "${product.name}" ` +
              `(${offsetDays}d) via: ${Object.entries(sent).filter(([,v])=>v).map(([k])=>k).join(', ') || 'in-app only'}`
            );
          }
        }
      }

      console.log('[cron] Warranty scan complete.');
    } catch (err) {
      console.error('[cron] Warranty scan error:', err.message);
    }
  });

  console.log('[cron] Warranty expiry job scheduled (daily at 08:00 AM)');
};

module.exports = startWarrantyCron;