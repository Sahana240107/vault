const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB            = require('./server/config/db');
const authRoutes           = require('./server/routes/auth.routes');
const vaultRoutes          = require('./server/routes/vault.routes');
const productRoutes        = require('./server/routes/product.routes');
const serviceHistoryRoutes = require('./server/routes/serviceHistory.routes');
const uploadRoutes         = require('./server/routes/upload.routes');
const notificationRoutes       = require('./server/routes/Notification.routes');
const geoRoutes                = require('./server/routes/geo.routes');
const startWarrantyCron        = require('./server/jobs/warrantyExpiry.job');
const { startWarrantyChecker } = require('./server/jobs/warrantyChecker.job');
const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

connectDB();
startWarrantyCron();
startWarrantyChecker();   // ← ADD this line
app.use('/api/auth',                 authRoutes);
app.use('/api/vaults',               vaultRoutes);
app.use('/api/products',             productRoutes);
app.use('/api/products/:id/service', serviceHistoryRoutes);
app.use('/api/upload',               uploadRoutes);
app.use('/api/notifications',        notificationRoutes);
app.use('/api/geo',                  geoRoutes);

// Health check (keeps Render free tier awake)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join-vault',   (vaultId) => socket.join(vaultId));
  socket.on('vault-update', (data)    => socket.to(data.vaultId).emit('vault-updated', data));
  socket.on('disconnect',   ()        => console.log('Socket disconnected:', socket.id));
});

app.set('io', io);

server.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);