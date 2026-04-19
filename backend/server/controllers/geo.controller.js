const ServiceCenter = require('../models/ServiceCenter');
const Product = require('../models/Product');
const VaultMember = require('../models/VaultMember');

// GET /api/geo/nearby?vaultId=&lat=&lng=&radiusKm=
exports.getNearbyAlerts = async (req, res) => {
  try {
    const { vaultId, lat, lng, radiusKm = 10 } = req.query;
    if (!vaultId || !lat || !lng)
      return res.status(400).json({ message: 'vaultId, lat, and lng are required.' });

    const member = await VaultMember.findOne({ vaultId, userId: req.user._id });
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Products with warranties expiring within 30 days
    const expiringProducts = await Product.find({
      vaultId,
      warrantyExpiry: { $gte: now, $lte: in30 },
      brand: { $ne: null, $exists: true },
    }).select('name brand warrantyExpiry');

    if (expiringProducts.length === 0)
      return res.json({ alerts: [], expiringProducts: [] });

    const brands = [...new Set(expiringProducts.map(p => p.brand.toLowerCase()))];

    // Find nearby centers using MongoDB 2dsphere
    const centers = await ServiceCenter.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: parseFloat(radiusKm) * 1000,
        },
      },
    });

    const alerts = centers
      .filter(sc => brands.some(b =>
        sc.brand.toLowerCase().includes(b) || b.includes(sc.brand.toLowerCase())
      ))
      .map(sc => {
        const R = 6371;
        const dLat = (latitude - sc.location.coordinates[1]) * Math.PI / 180;
        const dLng = (longitude - sc.location.coordinates[0]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(sc.location.coordinates[1] * Math.PI / 180) *
          Math.cos(latitude * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;
        const distanceKm = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);

        const matchingProducts = expiringProducts.filter(p =>
          p.brand.toLowerCase().includes(sc.brand.toLowerCase()) ||
          sc.brand.toLowerCase().includes(p.brand.toLowerCase())
        );

        return {
          center: {
            _id: sc._id,
            name: sc.name,
            brand: sc.brand,
            address: sc.address,
            phone: sc.phone,
            coordinates: sc.location.coordinates,
          },
          distanceKm: parseFloat(distanceKm),
          products: matchingProducts.map(p => ({
            _id: p._id,
            name: p.name,
            brand: p.brand,
            warrantyExpiry: p.warrantyExpiry,
            daysLeft: Math.floor((new Date(p.warrantyExpiry) - now) / (1000 * 60 * 60 * 24)),
          })),
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${sc.location.coordinates[1]},${sc.location.coordinates[0]}`,
          mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(sc.name)}`,
        };
      });

    res.json({ alerts, expiringProducts });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/geo/centers?brand=
exports.getServiceCenters = async (req, res) => {
  try {
    const { brand } = req.query;
    const filter = brand ? { brand: new RegExp(brand, 'i') } : {};
    const centers = await ServiceCenter.find(filter).limit(200);
    res.json(centers);
  } catch (err) { res.status(500).json({ message: err.message }); }
};