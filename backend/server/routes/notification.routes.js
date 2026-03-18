const express    = require('express');
const router     = express.Router();
const protect    = require('../middleware/auth.middleware');     
const {getNotifications,markRead,markAllRead,getPrefs,updatePrefs} = require('../controllers/notification.controller');        

router.get ('/',          protect, getNotifications);
router.put ('/:id/read',  protect, markRead);
router.put ('/read-all',  protect, markAllRead);
router.get ('/prefs',     protect, getPrefs);
router.put ('/prefs',     protect, updatePrefs);

module.exports = router;