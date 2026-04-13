/**
 * server/controllers/notification.controller.js
 */

const Notification   = require('../models/Notification');
const User           = require('../models/User');
const { sendTestEmail }       = require('../services/Notification.service');
const { runWarrantyCheck }    = require('../jobs/warrantyChecker.job');

// ─── GET /api/notifications ───────────────────────────────────────────────────
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

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/notifications/read-all ─────────────────────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/notifications/prefs ────────────────────────────────────────────
exports.getPrefs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPrefs email');
    res.json(user.notificationPrefs || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/notifications/prefs ────────────────────────────────────────────
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
      req.user._id,
      { $set: update },
      { new: true, select: 'notificationPrefs' }
    );
    res.json(user.notificationPrefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/notifications/test-email ──────────────────────────────────────
exports.sendTestEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPrefs email');
    const emailAddr = user.notificationPrefs?.emailAddr?.trim() || user.email;

    await sendTestEmail(emailAddr);
    res.json({ message: `Test email sent to ${emailAddr}` });
  } catch (err) {
    console.error('[test-email] Failed:', err.message);
    res.status(500).json({ message: `Failed to send test email: ${err.message}` });
  }
};

// ─── POST /api/notifications/test-run-checker (DEV ONLY) ─────────────────────
// Manually triggers the warranty checker immediately — useful for testing
// without waiting for the 9 AM cron. Remove or guard behind NODE_ENV in production.
exports.triggerWarrantyCheck = async (req, res) => {
  try {
    console.log('[test-run-checker] Manually triggered by user:', req.user._id);
    await runWarrantyCheck();
    res.json({ message: 'Warranty check completed — see server logs for details.' });
  } catch (err) {
    console.error('[test-run-checker] Failed:', err.message);
    res.status(500).json({ message: `Warranty check failed: ${err.message}` });
  }
};