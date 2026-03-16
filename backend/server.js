const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./server/config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
const vaultRoutes = require('./server/routes/vault.routes');
app.use('/api/vaults', vaultRoutes);
// test route — just to confirm the server is alive
app.get('/', (req, res) => {
  res.json({ message: 'VaultMERN API is running' });
});
const productRoutes = require('./server/routes/product.routes');
app.use('/api/products', productRoutes);
const authRoutes = require('./server/routes/auth.routes');  // add this
app.use('/api/auth', authRoutes);                           // add this
const serviceHistoryRoutes = require('./server/routes/serviceHistory.routes');
app.use('/api/products/:id/service', serviceHistoryRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));