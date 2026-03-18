/**
 * server/controllers/notification.controller.js
 */

const Notification = require('../models/Notification');
const User         = require('../models/User');

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
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
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
      req.user._id,
      { $set: update },
      { new: true, select: 'notificationPrefs' }
    );
    res.json(user.notificationPrefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};