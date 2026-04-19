/**
 * server/controllers/notification.controller.js
 *
 * Rule: Every Notification.create() call ALSO dispatches an email.
 */

const Notification   = require('../models/Notification');
const User           = require('../models/User');
const Product        = require('../models/Product');
const { sendTestEmail, sendEmail } = require('../services/Notification.service');
const { runWarrantyCheck }  = require('../jobs/warrantyChecker.job');
const { emitNotification }  = require('../utils/socketEmitter');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('productId', 'name brand category warrantyExpiry')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    const io = req.app.get('io');
    if (io) io.to(`user:${req.user._id}`).emit('notification-read', { id: req.params.id });
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    const io = req.app.get('io');
    if (io) io.to(`user:${req.user._id}`).emit('notifications-all-read');
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/notifications/prefs
exports.getPrefs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPrefs email');
    res.json(user.notificationPrefs || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notifications/prefs
exports.updatePrefs = async (req, res) => {
  try {
    const { emailAddr, daysBefore } = req.body;
    const update = {};
    if (emailAddr  !== undefined) update['notificationPrefs.emailAddr']  = emailAddr;
    if (daysBefore !== undefined) {
      const days = Array.isArray(daysBefore) ? daysBefore : [daysBefore];
      update['notificationPrefs.daysBefore'] = days.map(Number).filter(n => n > 0 && n <= 365);
    }
    const user = await User.findByIdAndUpdate(
      req.user._id, { $set: update },
      { new: true, select: 'notificationPrefs email' }
    );
    if (daysBefore !== undefined) {
      const io = req.app.get('io');
      _triggerImmediateCheckForUser(user, io).catch(err =>
        console.error('[prefs] Immediate check failed:', err.message)
      );
    }
    res.json(user.notificationPrefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notifications/test-email
exports.sendTestEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPrefs email');
    const emailAddr = user.notificationPrefs?.emailAddr?.trim() || user.email;
    await sendTestEmail(emailAddr);
    res.json({ message: `Test email sent to ${emailAddr}` });
  } catch (err) {
    res.status(500).json({ message: `Failed to send test email: ${err.message}` });
  }
};

// POST /api/notifications/test-run-checker (DEV ONLY)
exports.triggerWarrantyCheck = async (req, res) => {
  try {
    const io = req.app.get('io');
    await runWarrantyCheck(io);
    res.json({ message: 'Warranty check completed.' });
  } catch (err) {
    res.status(500).json({ message: `Warranty check failed: ${err.message}` });
  }
};

// ── Internal: immediate per-user check after prefs change ────────────────────
// Creates notification + sends email for every matching product window
const _triggerImmediateCheckForUser = async (user, io) => {
  const daysBefore = user.notificationPrefs?.daysBefore;
  if (!daysBefore?.length) return;

  const emailAddr = user.notificationPrefs?.emailAddr?.trim() || user.email;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  for (const daysLeft of daysBefore) {
    const target = new Date(now);
    target.setDate(target.getDate() + daysLeft);
    const startOfDay = new Date(target); startOfDay.setHours(0,  0,  0,   0);
    const endOfDay   = new Date(target); endOfDay.setHours(23, 59, 59, 999);

    const products = await Product.find({
      owner: user._id,
      warrantyExpiry: { $gte: startOfDay, $lte: endOfDay },
    });

    for (const product of products) {
      const alreadySent = await Notification.findOne({
        userId: user._id, productId: product._id,
        type: 'warranty_expiring', createdAt: { $gte: todayStart },
      });
      if (alreadySent) continue;

      // Send email
      let emailSent = false;
      try {
        await sendEmail({ to: emailAddr, productName: product.name, warrantyExpiry: product.warrantyExpiry, daysLeft });
        emailSent = true;
      } catch (e) {
        console.error('[prefs] Email failed:', e.message);
      }

      const notif = await Notification.create({
        userId: user._id, productId: product._id,
        type: 'warranty_expiring',
        message: `"${product.name}" warranty expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        channels: { email: emailSent },
      });

      emitNotification(io, user._id, notif);
    }
  }
};