import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';

const Dashboard = () => {
  const { user }                      = useAuth();
  const { vaults, activeVault, switchVault } = useVault();
  const navigate                      = useNavigate();
  const [products,  setProducts]      = useState([]);
  const [loading,   setLoading]       = useState(false);
  const [geoAlerts, setGeoAlerts]     = useState([]);

  // Load products whenever active vault changes
  useEffect(() => {
    if (!activeVault?._id) return;
    setLoading(true);
    api(`/products?vaultId=${activeVault._id}`)
      .then(data => { setProducts(data); setLoading(false); })
      .catch(err  => { console.error(err); setLoading(false); });
  }, [activeVault?._id]);

  // Geo alerts — try silently, don't block UI
  useEffect(() => {
    if (!activeVault?._id || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await api(
            `/geo/nearby?vaultId=${activeVault._id}&lat=${coords.latitude}&lng=${coords.longitude}&radiusKm=50`
          );
          setGeoAlerts(data.alerts || []);
        } catch { /* silent */ }
      },
      () => { /* denied, silent */ }
    );
  }, [activeVault?._id]);

  const now = new Date();

  const activeWarranties  = products.filter(p => p.warrantyExpiry && new Date(p.warrantyExpiry) > now);
  const expiringThisMonth = products.filter(p => {
    if (!p.warrantyExpiry) return false;
    const exp  = new Date(p.warrantyExpiry);
    const days = (exp - now) / 86400000;
    return days >= 0 && days <= 30;
  });
  const totalValue = products.reduce((s, p) => s + (p.purchasePrice || 0), 0);

  const getCategoryEmoji = cat => ({ Electronics:'📺', Appliance:'🧊', Vehicle:'🚗', Furniture:'🛋️' }[cat] || '📦');

  const getWarrantyChip = (exp) => {
    if (!exp) return null;
    const days = Math.floor((new Date(exp) - now) / 86400000);
    if (days < 0)    return <span className="chip danger">Expired</span>;
    if (days <= 7)   return <span className="chip danger">{days}d left</span>;
    if (days <= 30)  return <span className="chip warn">{days}d left</span>;
    return <span className="chip green">Active</span>;
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour      = now.getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today     = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'short', year:'numeric' });

  // Build real notifications from live data
  const notifications = [
    // Geo alerts
    ...geoAlerts.slice(0, 2).map(a => ({
      icon: '📍',
      type: 'geo',
      title: `${a.center.brand} Service Center Nearby`,
      sub:   `${a.distanceKm} km away · ${a.products.map(p => p.name).join(', ')}`,
    })),
    // Expiring warranty alerts
    ...expiringThisMonth.slice(0, 2).map(p => {
      const days = Math.floor((new Date(p.warrantyExpiry) - now) / 86400000);
      return {
        icon: '⏰',
        type: 'warn',
        title: `Warranty Expiring: ${p.name}`,
        sub:   `${days} day${days !== 1 ? 's' : ''} left · ${p.brand || p.category}`,
      };
    }),
    // Always show AI scanner tip if < 3 notifications
  ];
  if (notifications.length < 3) {
    notifications.push({
      icon: '🤖',
      type: 'info',
      title: 'AI Scanner Ready',
      sub:   'Upload a bill to auto-fill product details',
    });
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* HEADER */}
        <div className="page-header">
          <div>
            <p style={{ fontSize:13, color:'var(--text-muted)' }}>{today}</p>
            <h1>{greeting}, {firstName} 👋</h1>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>
              {expiringThisMonth.length > 0
                ? `${expiringThisMonth.length} warrant${expiringThisMonth.length > 1 ? 'ies' : 'y'} expiring this month.`
                : 'All warranties are healthy.'}
            </p>
            {/* Vault switcher */}
            {vaults.length > 1 && (
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                {vaults.map(v => (
                  <button key={v._id} onClick={() => switchVault(v)} style={{
                    padding:'3px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                    background:  activeVault?._id === v._id ? 'var(--gold)' : 'var(--deep)',
                    color:       activeVault?._id === v._id ? 'var(--void)' : 'var(--text-muted)',
                    border:     `1px solid ${activeVault?._id === v._id ? 'var(--gold)' : 'var(--border)'}`,
                    fontWeight:  activeVault?._id === v._id ? 700 : 400,
                    transition: 'all 0.15s',
                  }}>🏠 {v.name}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div className="live-dot">● Live Sync</div>
            <button className="btn-primary" onClick={() => navigate('/scan')}>+ Scan Bill</button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid-4" style={{ marginBottom:24 }}>
          <div className="stat-card gold-accent">
            <div className="stat-icon">📦</div>
            <div className="stat-label">TOTAL PRODUCTS</div>
            <div className="stat-value">{loading ? '…' : products.length}</div>
            <div className="stat-sub">in {activeVault?.name || 'your vault'}</div>
          </div>
          <div className="stat-card cyan-accent">
            <div className="stat-icon">📋</div>
            <div className="stat-label">ACTIVE WARRANTIES</div>
            <div className="stat-value">{activeWarranties.length}</div>
            <div className="stat-sub">{expiringThisMonth.length} expiring soon</div>
          </div>
          <div className="stat-card violet-accent">
            <div className="stat-icon">💰</div>
            <div className="stat-label">TOTAL VALUE</div>
            <div className="stat-value">
              {totalValue >= 1000 ? `₹${(totalValue/1000).toFixed(0)}K` : `₹${totalValue}`}
            </div>
            <div className="stat-sub">across all products</div>
          </div>
          <div className="stat-card green-accent">
            <div className="stat-icon">🏆</div>
            <div className="stat-label">VAULT HEALTH</div>
            <div className="stat-value">{activeVault?.healthScore || 0}</div>
            <div className="stat-sub">keep adding data</div>
          </div>
        </div>

        {/* MIDDLE ROW */}
        <div className="grid-2" style={{ marginBottom:24 }}>

          {/* WARRANTY TRACKER */}
          <div className="card-glint">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <p className="label">WARRANTY TRACKER</p>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginTop:4 }}>Expiring Soon</h3>
              </div>
              {expiringThisMonth.length > 0 && (
                <span className="chip warn">⚠ {expiringThisMonth.length} Critical</span>
              )}
            </div>
            {loading ? (
              <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'20px 0' }}>Loading…</p>
            ) : expiringThisMonth.length === 0 ? (
              <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'20px 0' }}>
                🎉 No warranties expiring soon
              </p>
            ) : (
              <table className="data-table" style={{ fontSize:12 }}>
                <thead><tr><th>PRODUCT</th><th>EXPIRES</th><th>STATUS</th></tr></thead>
                <tbody>
                  {expiringThisMonth.map(p => (
                    <tr key={p._id} onClick={() => navigate('/products')} style={{ cursor:'pointer' }}>
                      <td>{p.name}</td>
                      <td>{new Date(p.warrantyExpiry).toLocaleDateString('en-IN')}</td>
                      <td>{getWarrantyChip(p.warrantyExpiry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* LIVE NOTIFICATIONS */}
          <div className="card-glint">
            <div style={{ marginBottom:16 }}>
              <p className="label">GEO-AWARE ALERTS</p>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginTop:4 }}>Recent Notifications</h3>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {notifications.map((n, i) => (
                <div key={i} className={`alert-card ${n.type}`}>
                  <span style={{ fontSize:18 }}>{n.icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{n.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{n.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT PRODUCTS */}
        <div className="card-glint">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <p className="label">RECENTLY ADDED</p>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginTop:4 }}>Products</h3>
            </div>
            <button className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }} onClick={() => navigate('/products')}>
              View All →
            </button>
          </div>
          {loading ? (
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>Loading…</p>
          ) : products.length === 0 ? (
            <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'20px 0' }}>
              No products yet. Add your first product!
            </p>
          ) : (
            <div className="grid-4">
              {products.slice(0, 3).map(p => (
                <div key={p._id} className="product-card" onClick={() => navigate('/products')}>
                  <span style={{ fontSize:32, marginBottom:10, display:'block' }}>{getCategoryEmoji(p.category)}</span>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>{p.brand} · {p.category}</div>
                  {getWarrantyChip(p.warrantyExpiry)}
                </div>
              ))}
              <div className="product-card"
                style={{ borderStyle:'dashed', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
                onClick={() => navigate('/scan')}>
                <span style={{ fontSize:28 }}>➕</span>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:8 }}>Add Product</div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default Dashboard;