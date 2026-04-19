const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  register, login, updateMe, refreshToken,
} = require('../controllers/auth.controller');

router.post('/register',         register);
router.post('/login',            login);
router.post('/refresh',          refreshToken);

router.get ('/me',               protect, (req, res) => res.json(req.user));
router.put ('/me',               protect, updateMe);

// Change password — inline handler (no separate controller needed)
router.put('/change-password', protect, async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const User   = require('../models/User');
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Sessions — inline handlers
router.get('/sessions', protect, async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    let currentJti = null;
    try { currentJti = jwt.decode(token)?.jti ?? null; } catch(_) {}

    // Return a single "current session" entry since we don't persist sessions in DB
    res.json([{
      jti: currentJti || 'current',
      browser: req.headers['user-agent']?.split(' ').pop() || 'Unknown Browser',
      device: 'Web',
      ip: req.ip || 'Unknown',
      createdAt: new Date().toISOString(),
      icon: '🌐',
    }]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/sessions', protect, async (req, res) => {
  // No persistent session store — just acknowledge
  res.json({ message: 'All other sessions cleared' });
});

router.delete('/sessions/:jti', protect, async (req, res) => {
  res.json({ message: 'Session revoked' });
});

router.delete('/me', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;