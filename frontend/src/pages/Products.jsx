import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [vaultId, setVaultId] = useState(null);

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
  const getWarrantyChip = (exp) => {
    if (!exp) return <span className="chip" style={{ background:'var(--deep)',borderColor:'var(--border)',color:'var(--text-muted)' }}>No warranty</span>;
    const days = Math.floor((new Date(exp) - now) / (1000*60*60*24));
    if (days < 0) return <span className="chip danger">Expired</span>;
    if (days <= 7) return <span className="chip danger">Expiring</span>;
    if (days <= 30) return <span className="chip warn">Soon</span>;
    return <span className="chip green">Active</span>;
  };

  const getCategoryEmoji = (cat) => ({ Electronics:'📺', Appliance:'🧊', Vehicle:'🚗', Furniture:'🛋️' }[cat] || '📦');

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>PRODUCT CATALOGUE</p>
            <h1>All Products</h1>
            <p>{products.length} products · All warranties tracked</p>
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button className="btn-primary" onClick={() => navigate('/scan')}>+ Scan / Add</button>
          </div>
        </div>

        {/* FILTERS */}
        <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
          <input className="input-field" style={{ maxWidth:280 }} placeholder="🔍 Search products…" />
          <select className="input-field" style={{ maxWidth:150 }}>
            <option>All Categories</option>
            <option>Electronics</option>
            <option>Appliance</option>
            <option>Vehicle</option>
            <option>Furniture</option>
          </select>
          <select className="input-field" style={{ maxWidth:150 }}>
            <option>All Status</option>
            <option>Active</option>
            <option>Expiring</option>
            <option>Expired</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="card-glint">
          {products.length === 0 ? (
            <div style={{ textAlign:'center',padding:'60px 0' }}>
              <div style={{ fontSize:48,marginBottom:16 }}>📦</div>
              <h3 style={{ fontFamily:'Syne,sans-serif',marginBottom:8 }}>No products yet</h3>
              <p style={{ color:'var(--text-muted)',marginBottom:20 }}>Scan your first bill to get started!</p>
              <button className="btn-primary" onClick={() => navigate('/scan')}>📷 Scan a Bill</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>PRODUCT</th><th>BRAND</th><th>PURCHASE DATE</th><th>PRICE</th><th>WARRANTY</th><th>STATUS</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <span style={{ fontSize:20 }}>{getCategoryEmoji(p.category)}</span>
                        <div>
                          <div>{p.name}</div>
                          {p.serialNumber && <div style={{ fontSize:10,color:'var(--text-muted)' }}>SN: {p.serialNumber}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{p.brand || '—'}</td>
                    <td>{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : '—'}</td>
                    <td>{p.purchasePrice ? `₹${p.purchasePrice.toLocaleString()}` : '—'}</td>
                    <td>
                      {p.warrantyExpiry ? (
                        <div>
                          <div style={{ fontSize:12,marginBottom:4 }}>{new Date(p.warrantyExpiry).toLocaleDateString()}</div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width:'60%' }}></div>
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
      </main>
    </div>
  );
};

export default Products;