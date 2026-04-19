const User   = require('../models/User');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

let sendLoginEmail = async () => {};
try { sendLoginEmail = require('../services/Notification.service').sendLoginEmail; } catch(_) {}

// Helper — safe user payload (always includes createdAt)
const userPayload = (user) => ({
  id:        user._id,
  name:      user.name,
  email:     user.email,
  createdAt: user.createdAt,   // ← was missing; fixes "Member since" in Profile
});

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user  = await User.create({ name, email, passwordHash });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: userPayload(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)  return res.status(400).json({ message: 'Invalid email or password' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const alertAddr = user.notificationPrefs?.emailAddr?.trim() || user.email;
    sendLoginEmail(alertAddr, user.name).catch(() => {});
    res.status(200).json({ token, user: userPayload(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id, { name, email }, { new: true }
    ).select('-passwordHash');
    res.json(userPayload(user));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'User not found' });
    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: newToken, user: userPayload(user) });
  } catch (err) { res.status(401).json({ message: 'Token invalid or expired' }); }
};