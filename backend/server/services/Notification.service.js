/**
 * server/services/Notification.service.js
 *
 * Email-only notification dispatcher using Nodemailer.
 *
 * Required .env variables:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=vaultofficial67@gmail.com
 *   SMTP_PASS=duzcwqskeywgwhak        ← 16-char Gmail App Password
 *   FRONTEND_URL=http://localhost:5173
 */

const nodemailer = require('nodemailer');

// ─── Transporter (lazy-init with verification) ────────────────────────────────
let _transporter = null;

const getTransporter = async () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: false,            // STARTTLS on port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Prevents "self-signed cert" errors on some hosts
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify SMTP connection on first use so errors surface early
    try {
      await _transporter.verify();
      console.log('[notify] SMTP connection verified ✓');
    } catch (err) {
      console.error('[notify] SMTP verification failed:', err.message);
      _transporter = null; // reset so next call retries
      throw err;
    }
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

// ─── Test Email Template ──────────────────────────────────────────────────────
const buildTestEmailHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #0d0d0d; color: #f0f0f0; margin:0; padding:0; }
    .container { max-width: 560px; margin: 40px auto; background: #1a1a1a;
                 border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a; }
    .header { background: #4caf50; padding: 24px 32px; }
    .header h1 { margin:0; color:#fff; font-size:22px; }
    .body { padding: 28px 32px; color: #bbb; font-size: 15px; line-height: 1.7; }
    .footer { padding:16px 32px; font-size:11px; color:#555; border-top:1px solid #2a2a2a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>✅ VaultMERN — Email Connected!</h1></div>
    <div class="body">
      <p>Your email notifications are working correctly.</p>
      <p>You'll receive warranty expiry alerts at this address based on your notification preferences.</p>
    </div>
    <div class="footer">Sent from VaultMERN at ${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`;

// ─── Send Email ───────────────────────────────────────────────────────────────
const sendEmail = async ({ to, productName, warrantyExpiry, daysLeft }) => {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from:    `"VaultMERN" <${process.env.SMTP_USER}>`,
    to,
    subject: `⚠️ Warranty Alert: "${productName}" expires in ${daysLeft} days`,
    html:    buildEmailHtml(productName, warrantyExpiry, daysLeft),
  });
  console.log(`[notify] Email sent to ${to} for "${productName}"`);
};

// ─── Send Test Email ──────────────────────────────────────────────────────────
const sendTestEmail = async (to) => {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from:    `"VaultMERN" <${process.env.SMTP_USER}>`,
    to,
    subject: '✅ VaultMERN — Email notifications are working!',
    html:    buildTestEmailHtml(),
  });
  console.log(`[notify] Test email sent to ${to}`);
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

module.exports = { sendEmail, sendTestEmail, dispatchWarrantyAlert };