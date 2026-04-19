/**
 * backend/server.js
 *
 * Changes from original:
 *  1. Removed startWarrantyCron (warrantyExpiry.job) — it was a duplicate job
 *     that also had a case-sensitive import bug on Linux.
 *  2. Pass `io` to startWarrantyChecker so the cron can push real-time Socket.IO
 *     events to the Notifications page.
 *  3. Added `user:<userId>` personal rooms so each user only gets their own alerts.
 *  4. Fixed route require: 'Notification.routes' → 'notification.routes' (exact filename).
 */

const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB                 = require('./server/config/db');
const authRoutes                = require('./server/routes/auth.routes');
const vaultRoutes               = require('./server/routes/vault.routes');
const productRoutes             = require('./server/routes/product.routes');
const serviceHistoryRoutes      = require('./server/routes/serviceHistory.routes');
const uploadRoutes              = require('./server/routes/upload.routes');
const notificationRoutes        = require('./server/routes/notification.routes');   // ← lowercase (matches filename)
const geoRoutes                 = require('./server/routes/geo.routes');
const { startWarrantyChecker }  = require('./server/jobs/warrantyChecker.job');     // ← single job only

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:  process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Make io accessible inside controllers & jobs via req.app.get('io')
app.set('io', io);

connectDB();

// Start the single warranty checker cron (pass io so it can push real-time events)
startWarrantyChecker(io);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',                 authRoutes);
app.use('/api/vaults',               vaultRoutes);
app.use('/api/products',             productRoutes);
app.use('/api/products/:id/service', serviceHistoryRoutes);
app.use('/api/upload',               uploadRoutes);
app.use('/api/notifications',        notificationRoutes);
app.use('/api/geo',                  geoRoutes);

// Health check (keeps Render free tier awake)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[socket] Connected:', socket.id);

  // Vault-level room (for product/vault updates shared with all vault members)
  socket.on('join-vault', (vaultId) => {
    socket.join(vaultId);
    console.log(`[socket] ${socket.id} joined vault room: ${vaultId}`);
  });

  // Personal user room (for private notifications — each user joins their own room)
  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`[socket] ${socket.id} joined user room: user:${userId}`);
  });

  socket.on('vault-update', (data) => socket.to(data.vaultId).emit('vault-updated', data));
  socket.on('disconnect',   ()     => console.log('[socket] Disconnected:', socket.id));
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(process.env.PORT || 5000, () =>
  console.log(`[server] Running on port ${process.env.PORT || 5000}`)
);