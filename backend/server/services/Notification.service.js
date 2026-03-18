/**
 * server/services/notification.service.js
 *
 * Email-only notification dispatcher using Nodemailer.
 *
 * Install: npm install nodemailer
 *
 * Required .env variables:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=youremail@gmail.com
 *   SMTP_PASS=your_16char_app_password
 *   FRONTEND_URL=http://localhost:5173
 */

const nodemailer = require('nodemailer');

// ─── Transporter (lazy-init) ──────────────────────────────────────────────────
let _transporter = null;
const getTransporter = () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
};

// ─── HTML Email Template ──────────────────────────────────────────────────────
const buildEmailHtml = (productName, expiryDate, daysLeft) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #0d0d0d; color: #f0f0f0; margin:0; padding:0; }
    .container { max-width: 560px; margin: 40px auto; background: #1a1a1a;
                 border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a; }
    .header { background: #e8b84b; padding: 24px 32px; }
    .header h1 { margin:0; color:#000; font-size:22px; }
    .body { padding: 28px 32px; }
    .chip { display:inline-block; background:rgba(232,184,75,0.15); color:#e8b84b;
            border:1px solid rgba(232,184,75,0.4); border-radius:20px;
            padding:4px 14px; font-size:13px; font-weight:600; margin-bottom:16px; }
    .product-name { font-size:20px; font-weight:700; color:#fff; margin:0 0 8px; }
    .expiry { font-size:14px; color:#aaa; margin:0 0 24px; }
    .cta { display:inline-block; background:#e8b84b; color:#000; padding:12px 28px;
           border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; }
    .footer { padding:16px 32px; font-size:11px; color:#555; border-top:1px solid #2a2a2a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>⚠️ VaultMERN — Warranty Alert</h1></div>
    <div class="body">
      <span class="chip">Expiring in ${daysLeft} days</span>
      <p class="product-name">${productName}</p>
      <p class="expiry">Warranty expires on <strong>${new Date(expiryDate).toDateString()}</strong></p>
      <p style="color:#bbb;font-size:14px;line-height:1.6;">
        Don't let your warranty lapse without taking action. Log in to VaultMERN to view
        your product details, book a service, or start an insurance claim.
      </p>
      <a class="cta" href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/products">
        View in VaultMERN →
      </a>
    </div>
    <div class="footer">
      You're receiving this because warranty alerts are enabled on your VaultMERN account.
    </div>
  </div>
</body>
</html>`;

// ─── Send Email ───────────────────────────────────────────────────────────────
const sendEmail = async ({ to, productName, warrantyExpiry, daysLeft }) => {
  const transporter = getTransporter();
  await transporter.sendMail({
    from:    `"VaultMERN" <${process.env.SMTP_USER}>`,
    to,
    subject: `⚠️ Warranty Alert: "${productName}" expires in ${daysLeft} days`,
    html:    buildEmailHtml(productName, warrantyExpiry, daysLeft),
  });
  console.log(`[notify] Email sent to ${to} for "${productName}"`);
};

// ─── Master dispatcher ────────────────────────────────────────────────────────
const dispatchWarrantyAlert = async (user, product, daysLeft) => {
  const sent      = { email: false };
  const emailAddr = user.notificationPrefs?.emailAddr?.trim() || user.email;

  try {
    await sendEmail({
      to:             emailAddr,
      productName:    product.name,
      warrantyExpiry: product.warrantyExpiry,
      daysLeft,
    });
    sent.email = true;
  } catch (err) {
    console.error(`[notify] Email failed for user ${user._id}:`, err.message);
  }

  return sent;
};

module.exports = { sendEmail, dispatchWarrantyAlert };