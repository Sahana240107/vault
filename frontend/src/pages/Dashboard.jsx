import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [vault, setVault] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const vaults = await api('/vaults/my');
        if (vaults.length > 0) {
          setVault(vaults[0]);
          const prods = await api(`/products?vaultId=${vaults[0]._id}`);
          setProducts(prods);
        }
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  const now = new Date();
  const activeWarranties = products.filter(p => p.warrantyExpiry && new Date(p.warrantyExpiry) > now);
  const expiringThisMonth = products.filter(p => {
    if (!p.warrantyExpiry) return false;
    const exp = new Date(p.warrantyExpiry);
    return exp > now && (exp - now) < 30 * 24 * 60 * 60 * 1000;
  });

  const getCategoryEmoji = (cat) => ({ Electronics:'📺', Appliance:'🧊', Vehicle:'🚗', Furniture:'🛋️' }[cat] || '📦');

  const getWarrantyChip = (exp) => {
    if (!exp) return null;
    const days = Math.floor((new Date(exp) - now) / (1000*60*60*24));
    if (days < 0) return <span className="chip danger">Expired</span>;
    if (days <= 7) return <span className="chip danger">{days}d left</span>;
    if (days <= 30) return <span className="chip warn">{days}d left</span>;
    return <span className="chip green">Active</span>;
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'short', year:'numeric' });

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p style={{ fontSize:13,color:'var(--text-muted)' }}>{today}</p>
            <h1>Good morning, {firstName} 👋</h1>
            <p>{expiringThisMonth.length} warranties expiring this month.</p>
          </div>
          <div style={{ display:'flex',gap:10,flexWrap:'wrap',alignItems:'center' }}>
            <div className="live-dot">Live Sync</div>
            <button className="btn-primary" onClick={() => navigate('/scan')}>+ Scan Bill</button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid-4" style={{ marginBottom:24 }}>
          <div className="stat-card gold-accent">
            <div className="stat-icon">📦</div>
            <div className="stat-label">TOTAL PRODUCTS</div>
            <div className="stat-value">{products.length}</div>
            <div className="stat-sub">in your vault</div>
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
            <div className="stat-value">₹{(products.reduce((s,p) => s + (p.purchasePrice||0), 0)/1000).toFixed(0)}K</div>
            <div className="stat-sub">across all products</div>
          </div>
          <div className="stat-card green-accent">
            <div className="stat-icon">🏆</div>
            <div className="stat-label">VAULT HEALTH</div>
            <div className="stat-value">{vault?.healthScore || 0}</div>
            <div className="stat-sub">keep adding data</div>
          </div>
        </div>

        {/* MIDDLE ROW */}
        <div className="grid-2" style={{ marginBottom:24 }}>
          {/* WARRANTY TRACKER */}
          <div className="card-glint">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div>
                <p className="label">WARRANTY TRACKER</p>
                <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginTop:4 }}>Expiring Soon</h3>
              </div>
              <span className="chip warn">⚠ {expiringThisMonth.length} Critical</span>
            </div>
            {expiringThisMonth.length === 0 ? (
              <p style={{ fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:'20px 0' }}>🎉 No warranties expiring soon</p>
            ) : (
              <table className="data-table" style={{ fontSize:12 }}>
                <thead><tr><th>PRODUCT</th><th>EXPIRES</th><th>STATUS</th></tr></thead>
                <tbody>
                  {expiringThisMonth.map(p => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>{new Date(p.warrantyExpiry).toLocaleDateString()}</td>
                      <td>{getWarrantyChip(p.warrantyExpiry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ALERTS */}
          <div className="card-glint">
            <div style={{ marginBottom:16 }}>
              <p className="label">GEO-AWARE ALERTS</p>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginTop:4 }}>Recent Notifications</h3>
            </div>
            <div className="alert-card geo">
              <span style={{ fontSize:18 }}>📍</span>
              <div>
                <div style={{ fontSize:12,fontWeight:600,marginBottom:2 }}>Samsung Service Center Nearby</div>
                <div style={{ fontSize:11,color:'var(--text-muted)' }}>0.8km away · TV warranty expires in 7 days</div>
              </div>
            </div>
            <div className="alert-card warn">
              <span style={{ fontSize:18 }}>⏰</span>
              <div>
                <div style={{ fontSize:12,fontWeight:600,marginBottom:2 }}>Warranty Expiry Reminder</div>
                <div style={{ fontSize:11,color:'var(--text-muted)' }}>Check your expiring products</div>
              </div>
            </div>
            <div className="alert-card info">
              <span style={{ fontSize:18 }}>🤖</span>
              <div>
                <div style={{ fontSize:12,fontWeight:600,marginBottom:2 }}>AI Scanner Ready</div>
                <div style={{ fontSize:11,color:'var(--text-muted)' }}>Upload a bill to auto-fill product details</div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT PRODUCTS */}
        <div className="card-glint">
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
            <div>
              <p className="label">RECENTLY ADDED</p>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginTop:4 }}>Products</h3>
            </div>
            <button className="btn-ghost" style={{ fontSize:12,padding:'8px 14px' }} onClick={() => navigate('/products')}>View All →</button>
          </div>
          <div className="grid-4">
            {products.slice(0,3).map(p => (
              <div key={p._id} className="product-card" onClick={() => navigate('/products')}>
                <span style={{ fontSize:32,marginBottom:10,display:'block' }}>{getCategoryEmoji(p.category)}</span>
                <div style={{ fontWeight:600,fontSize:14,marginBottom:4 }}>{p.name}</div>
                <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:10 }}>{p.brand} · {p.category}</div>
                {getWarrantyChip(p.warrantyExpiry)}
              </div>
            ))}
            <div className="product-card" style={{ borderStyle:'dashed',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer' }} onClick={() => navigate('/scan')}>
              <span style={{ fontSize:28 }}>➕</span>
              <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:8 }}>Add Product</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;