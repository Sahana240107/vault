# fix-vault.ps1
# Run from: vault/backend/
# Command:  powershell -ExecutionPolicy Bypass -File fix-vault.ps1

Write-Host "`n=== VaultMERN Auto-Fix ===" -ForegroundColor Cyan

# ── 1. Create utils folder ────────────────────────────────────────────────────
New-Item -ItemType Directory -Path "server\utils" -Force | Out-Null
Write-Host "[OK] server/utils/ folder ready" -ForegroundColor Green

# ── 2. Write socketEmitter.js ─────────────────────────────────────────────────
Set-Content "server\utils\socketEmitter.js" @'
const emitNotification = (io, userId, notification) => {
  if (!io) return;
  try { io.to(`user:${userId.toString()}`).emit('new-notification', notification); }
  catch (err) { console.error('[socketEmitter]', err.message); }
};
module.exports = { emitNotification };
'@
Write-Host "[OK] server/utils/socketEmitter.js" -ForegroundColor Green

# ── 3. Write auth.controller.js ───────────────────────────────────────────────
Set-Content "server\controllers\auth.controller.js" @'
const User   = require('../models/User');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

let sendLoginEmail = async () => {};
try { sendLoginEmail = require('../services/Notification.service').sendLoginEmail; } catch(_) {}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user  = await User.create({ name, email, passwordHash });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
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
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, email }, { new: true }).select('-passwordHash');
    res.json(user);
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
    res.json({ token: newToken, user });
  } catch (err) { res.status(401).json({ message: 'Token invalid or expired' }); }
};
'@
Write-Host "[OK] server/controllers/auth.controller.js" -ForegroundColor Green

# ── 4. Write Notification.service.js ─────────────────────────────────────────
Set-Content "server\services\Notification.service.js" @'
const nodemailer = require('nodemailer');

let _transporter = null;
const getTransporter = async () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
    try { await _transporter.verify(); console.log('[notify] SMTP verified'); }
    catch (err) { console.error('[notify] SMTP failed:', err.message); _transporter = null; throw err; }
  }
  return _transporter;
};

const BASE = `body{font-family:Arial,sans-serif;background:#0d0d0d;color:#f0f0f0;margin:0}
.w{max-width:560px;margin:40px auto;background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden}
.h{padding:24px 32px}.b{padding:28px 32px;color:#bbb;font-size:14px;line-height:1.7}
.cta{display:inline-block;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
.f{padding:16px 32px;font-size:11px;color:#555;border-top:1px solid #2a2a2a}`;

const sendEmail = async ({ to, productName, warrantyExpiry, daysLeft }) => {
  const t = await getTransporter();
  await t.sendMail({
    from: `"VaultMERN" <${process.env.SMTP_USER}>`,
    to,
    subject: `⚠️ Warranty Alert: "${productName}" expires in ${daysLeft} days`,
    html: `<!DOCTYPE html><html><head><style>${BASE}</style></head><body><div class="w">
      <div class="h" style="background:#e8b84b"><h1 style="margin:0;color:#000;font-size:20px">⚠️ VaultMERN — Warranty Alert</h1></div>
      <div class="b">
        <p style="font-size:20px;font-weight:700;color:#fff;margin:0 0 8px">${productName}</p>
        <p style="color:#aaa;margin:0 0 20px">Warranty expires on <strong>${new Date(warrantyExpiry).toDateString()}</strong> — in ${daysLeft} days</p>
        <p>Log in to view your product, book a service, or start an insurance claim.</p>
        <a class="cta" style="background:#e8b84b;color:#000" href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/products">View in VaultMERN →</a>
      </div>
      <div class="f">Warranty alerts are enabled on your VaultMERN account.</div>
    </div></body></html>`,
  });
  console.log(`[notify] Warranty email → ${to} for "${productName}"`);
};

const sendLoginEmail = async (to, userName) => {
  try {
    const t = await getTransporter();
    await t.sendMail({
      from: `"VaultMERN" <${process.env.SMTP_USER}>`,
      to,
      subject: '🔐 VaultMERN — New login to your account',
      html: `<!DOCTYPE html><html><head><style>${BASE}</style></head><body><div class="w">
        <div class="h" style="background:#1e3a5f"><h1 style="margin:0;color:#63cab7;font-size:20px">🔐 VaultMERN — New Login Detected</h1></div>
        <div class="b">
          <p>Hi <strong style="color:#fff">${userName}</strong>,</p>
          <p>A new login was just detected on your VaultMERN account at <strong>${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</strong> IST.</p>
          <p>If this was you, no action needed. If not, change your password immediately.</p>
          <a class="cta" style="background:#63cab7;color:#000" href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile">Review Account Security →</a>
        </div>
        <div class="f">Automated security alert from VaultMERN.</div>
      </div></body></html>`,
    });
    console.log(`[notify] Login email → ${to}`);
  } catch (err) {
    console.error('[notify] Login email failed (non-fatal):', err.message);
  }
};

const sendTestEmail = async (to) => {
  const t = await getTransporter();
  await t.sendMail({
    from: `"VaultMERN" <${process.env.SMTP_USER}>`,
    to,
    subject: '✅ VaultMERN — Email notifications are working!',
    html: `<!DOCTYPE html><html><head><style>${BASE}</style></head><body><div class="w">
      <div class="h" style="background:#2e7d32"><h1 style="margin:0;color:#fff;font-size:20px">✅ VaultMERN — Email Connected!</h1></div>
      <div class="b"><p>Your email notifications are working correctly. You'll receive warranty alerts at this address.</p></div>
      <div class="f">Sent at ${new Date().toLocaleString()}</div>
    </div></body></html>`,
  });
  console.log(`[notify] Test email → ${to}`);
};

const dispatchWarrantyAlert = async (user, product, daysLeft) => {
  const sent = { email: false };
  const emailAddr = user.notificationPrefs?.emailAddr?.trim() || user.email;
  try {
    await sendEmail({ to: emailAddr, productName: product.name, warrantyExpiry: product.warrantyExpiry, daysLeft });
    sent.email = true;
  } catch (err) {
    console.error(`[notify] Email failed for ${user._id}:`, err.message);
  }
  return sent;
};

module.exports = { sendEmail, sendTestEmail, sendLoginEmail, dispatchWarrantyAlert };
'@
Write-Host "[OK] server/services/Notification.service.js" -ForegroundColor Green

Write-Host "`n=== All done! Run: node server.js ===" -ForegroundColor Cyan