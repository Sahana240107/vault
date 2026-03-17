import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import ProductDetailDrawer from '../components/ProductDetailDrawer';
import EditProductModal from '../components/EditProductModal';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [vaultId, setVaultId] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const vaults = await api('/vaults/my');
        if (vaults.length > 0) {
          setVaultId(vaults[0]._id);
          const prods = await api(`/products?vaultId=${vaults[0]._id}`);
          setProducts(prods);
        }
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  const now = new Date();

  const getWarrantyStatus = (exp) => {
    if (!exp) return 'none';
    const days = Math.floor((new Date(exp) - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'active';
  };

  const getWarrantyChip = (exp) => {
    const s = getWarrantyStatus(exp);
    if (s === 'none') return <span className="chip" style={{ background: 'var(--deep)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>No warranty</span>;
    if (s === 'expired') return <span className="chip danger">Expired</span>;
    if (s === 'expiring') return <span className="chip warn">Expiring Soon</span>;
    return <span className="chip green">Active</span>;
  };

  const getCategoryEmoji = (cat) => ({ Electronics: '📺', Appliance: '🧊', Vehicle: '🚗', Furniture: '🛋️' }[cat] || '📦');

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      if (q && !p.name?.toLowerCase().includes(q) && !p.brand?.toLowerCase().includes(q) && !p.notes?.toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'All') {
        const s = getWarrantyStatus(p.warrantyExpiry);
        if (statusFilter === 'Active' && s !== 'active') return false;
        if (statusFilter === 'Expiring' && s !== 'expiring') return false;
        if (statusFilter === 'Expired' && s !== 'expired') return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'price-high') return (b.purchasePrice || 0) - (a.purchasePrice || 0);
      if (sortBy === 'price-low') return (a.purchasePrice || 0) - (b.purchasePrice || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api(`/products/${product._id}`, 'DELETE');
      setProducts(prev => prev.filter(p => p._id !== product._id));
      setSelectedProduct(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaved = (updated) => {
    setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
    setSelectedProduct(updated);
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom: 6 }}>PRODUCT CATALOGUE</p>
            <h1>All Products</h1>
            <p>{products.length} products · {filtered.length} showing</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={() => navigate('/scan')}>+ Scan / Add</button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input-field" style={{ maxWidth: 260 }}
            placeholder="🔍 Search name, brand, notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input-field" style={{ maxWidth: 150 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Appliance">Appliance</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Furniture">Furniture</option>
            <option value="Other">Other</option>
          </select>
          <select className="input-field" style={{ maxWidth: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Expiring">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>
          <select className="input-field" style={{ maxWidth: 160 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="price-high">Sort: Price ↓</option>
            <option value="price-low">Sort: Price ↑</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
          {(search || categoryFilter !== 'All' || statusFilter !== 'All') && (
            <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 12px' }}
              onClick={() => { setSearch(''); setCategoryFilter('All'); setStatusFilter('All'); }}>
              Clear Filters ✕
            </button>
          )}
        </div>

        {/* TABLE */}
        <div className="card-glint">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {products.length === 0 ? '📦' : '🔍'}
              </div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', marginBottom: 8 }}>
                {products.length === 0 ? 'No products yet' : 'No results found'}
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                {products.length === 0 ? 'Scan your first bill to get started!' : 'Try changing your search or filters.'}
              </p>
              {products.length === 0 && (
                <button className="btn-primary" onClick={() => navigate('/scan')}>📷 Scan a Bill</button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>BRAND</th>
                  <th>PURCHASE DATE</th>
                  <th>PRICE</th>
                  <th>WARRANTY</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id} onClick={() => setSelectedProduct(p)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{getCategoryEmoji(p.category)}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.serialNumber && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SN: {p.serialNumber}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{p.brand || '—'}</td>
                    <td>{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : '—'}</td>
                    <td>{p.purchasePrice ? `₹${p.purchasePrice.toLocaleString()}` : '—'}</td>
                    <td>
                      {p.warrantyExpiry ? (
                        <div>
                          <div style={{ fontSize: 12, marginBottom: 4 }}>{new Date(p.warrantyExpiry).toLocaleDateString()}</div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{
                              width: (() => {
                                if (!p.purchaseDate || !p.warrantyExpiry) return '0%';
                                const total = new Date(p.warrantyExpiry) - new Date(p.purchaseDate);
                                const elapsed = now - new Date(p.purchaseDate);
                                const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                                return `${100 - pct}%`;
                              })()
                            }}></div>
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>{getWarrantyChip(p.warrantyExpiry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* GEO ALERT BANNER */}
        <GeoAlertBanner products={products} />
      </main>

      {/* Product Detail Drawer */}
      {selectedProduct && (
        <ProductDetailDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={(p) => { setEditingProduct(p); setSelectedProduct(null); }}
          onDelete={handleDelete}
        />
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

// ── Geo Alert Banner (Member 3 feature) ───────────────────────────
const GeoAlertBanner = ({ products }) => {
  const [location, setLocation] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [nearbyAlerts, setNearbyAlerts] = useState([]);

  // Static seed data for service centers (top brands)
  const SERVICE_CENTERS = [
    { brand: 'Samsung', name: 'Samsung Service Center - Anna Nagar', lat: 13.085, lng: 80.210 },
    { brand: 'Samsung', name: 'Samsung Service Center - T Nagar', lat: 13.040, lng: 80.233 },
    { brand: 'Apple', name: 'Apple Authorized Service - Nungambakkam', lat: 13.060, lng: 80.242 },
    { brand: 'LG', name: 'LG Service Center - Adyar', lat: 13.000, lng: 80.254 },
    { brand: 'Sony', name: 'Sony Service Center - Velachery', lat: 12.979, lng: 80.220 },
    { brand: 'Bosch', name: 'Bosch Service - Guindy', lat: 13.011, lng: 80.212 },
    { brand: 'Whirlpool', name: 'Whirlpool Service - Porur', lat: 13.037, lng: 80.158 },
  ];

  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const requestLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported by your browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });

        // Find expiring products within 30 days
        const now = new Date();
        const expiringBrands = products
          .filter(p => p.warrantyExpiry && p.brand)
          .filter(p => {
            const days = Math.floor((new Date(p.warrantyExpiry) - now) / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 30;
          })
          .map(p => p.brand.toLowerCase());

        // Find nearby matching service centers (within 5 km)
        const alerts = SERVICE_CENTERS
          .filter(sc => expiringBrands.some(b => sc.brand.toLowerCase().includes(b) || b.includes(sc.brand.toLowerCase())))
          .map(sc => ({ ...sc, distance: haversineKm(latitude, longitude, sc.lat, sc.lng).toFixed(1) }))
          .filter(sc => sc.distance <= 5)
          .sort((a, b) => a.distance - b.distance);

        setNearbyAlerts(alerts);
      },
      (err) => setGeoError('Location access denied. Enable to see nearby service alerts.')
    );
  };

  if (!location && !geoError) {
    return (
      <div className="card" style={{ marginTop: 16, borderColor: 'var(--cyan)', background: 'var(--cyan-dim)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 22 }}>📍</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)', marginBottom: 2 }}>Geo-Aware Service Alerts</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Allow location to find service centers near you with expiring warranties</div>
        </div>
        <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px', borderColor: 'var(--cyan)', color: 'var(--cyan)' }} onClick={requestLocation}>
          Enable
        </button>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className="card" style={{ marginTop: 16, borderColor: 'rgba(245,75,75,0.3)', background: 'rgba(245,75,75,0.04)', fontSize: 12, color: 'var(--text-muted)' }}>
        📍 {geoError}
      </div>
    );
  }

  if (nearbyAlerts.length === 0) {
    return (
      <div className="card" style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        ✅ No nearby service centers matching your expiring warranties found within 5 km.
      </div>
    );
  }

  return (
    <div className="card-glint" style={{ marginTop: 16, borderColor: 'rgba(75,232,216,0.3)' }}>
      <p className="label" style={{ marginBottom: 12 }}>📍 GEO-AWARE ALERTS — NEAR YOU</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nearbyAlerts.map((sc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--deep)', borderRadius: 8, borderLeft: '3px solid var(--cyan)' }}>
            <span>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{sc.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sc.distance} km away · {sc.brand} warranty expiring soon</div>
            </div>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(sc.name)}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-ghost" style={{ fontSize: 10, padding: '5px 10px' }}>
              Navigate →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;