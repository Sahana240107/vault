/**
 * server/routes/notification.routes.js
 */

const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  getNotifications,
  markRead,
  markAllRead,
  getPrefs,
  updatePrefs,
  sendTestEmail,
  triggerWarrantyCheck,   // ← new dev/test endpoint
} = require('../controllers/notification.controller');

router.get ('/prefs',           protect, getPrefs);              // GET  /api/notifications/prefs
router.put ('/prefs',           protect, updatePrefs);           // PUT  /api/notifications/prefs
router.put ('/read-all',        protect, markAllRead);           // PUT  /api/notifications/read-all  ← MUST be before /:id
router.post('/test-email',      protect, sendTestEmail);         // POST /api/notifications/test-email
router.post('/test-run-checker',protect, triggerWarrantyCheck);  // POST /api/notifications/test-run-checker  (DEV ONLY)
router.get ('/',                protect, getNotifications);      // GET  /api/notifications
router.put ('/:id/read',        protect, markRead);              // PUT  /api/notifications/:id/read

module.exports = router;