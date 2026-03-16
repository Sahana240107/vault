import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [vaults, setVaults] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeVault, setActiveVault] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCreateVault, setShowCreateVault] = useState(false);
  const [vaultName, setVaultName] = useState('');
  const [form, setForm] = useState({ name:'', brand:'', category:'Electronics', purchasePrice:'', warrantyExpiry:'' });
  const [error, setError] = useState('');

  useEffect(() => { fetchVaults(); }, []);
  useEffect(() => { if (activeVault) fetchProducts(); }, [activeVault]);

  const fetchVaults = async () => {
    try {
      const data = await api('/vaults/my');
      setVaults(data);
      if (data.length > 0) setActiveVault(data[0]);
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const data = await api(`/products?vaultId=${activeVault._id}`);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const handleCreateVault = async (e) => {
    e.preventDefault();
    try {
      await api('/vaults', 'POST', { name: vaultName });
      setVaultName(''); setShowCreateVault(false);
      fetchVaults();
    } catch (err) { setError(err.message); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await api('/products', 'POST', { ...form, vaultId: activeVault._id });
      setForm({ name:'', brand:'', category:'Electronics', purchasePrice:'', warrantyExpiry:'' });
      setShowAddProduct(false);
      fetchProducts();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api(`/products/${id}`, 'DELETE');
      fetchProducts();
    } catch (err) { setError(err.message); }
  };

  const getWarrantyChip = (expiry) => {
    if (!expiry) return <span className="chip warn">No warranty</span>;
    const days = Math.ceil((new Date(expiry) - new Date()) / (1000*60*60*24));
    if (days < 0)  return <span className="chip danger">Expired</span>;
    if (days < 30) return <span className="chip warn">Expiring soon</span>;
    return <span className="chip green">Active</span>;
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const expiringSoon = products.filter(p => {
    if (!p.warrantyExpiry) return false;
    const days = Math.ceil((new Date(p.warrantyExpiry) - new Date()) / (1000*60*60*24));
    return days >= 0 && days <= 30;
  });

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          Vault<span className="gold">MERN</span>
          <small>DIGITAL VAULT</small>
        </div>
        <div className="nav-section">Main</div>
        <a className="nav-item active"><span className="nav-icon">⊞</span> Dashboard</a>
        <a className="nav-item" onClick={() => navigate('/products')}><span className="nav-icon">◈</span> Products</a>
        <a className="nav-item"><span className="nav-icon">◎</span> Vault</a>
        <a className="nav-item"><span className="nav-icon">◉</span> Analytics</a>
        <div className="nav-section">Account</div>
        <a className="nav-item"><span className="nav-icon">⊙</span> Notifications</a>
        <a className="nav-item" onClick={() => { logout(); navigate('/login'); }}>
          <span className="nav-icon">→</span> Logout
        </a>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="avatar">{initials}</div>
            <div>
              <div style={{fontSize:'13px', fontWeight:500}}>{user?.name}</div>
              <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{activeVault?.role || 'owner'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* TOPBAR */}
        <div className="topbar">
          <select style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'8px 12px',color:'var(--text-primary)',fontSize:'13px',outline:'none',cursor:'pointer'}}
            value={activeVault?._id || ''} onChange={e => setActiveVault(vaults.find(v => v._id === e.target.value))}>
            {vaults.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
          <input className="topbar-search" placeholder="Search products..." />
          <div style={{marginLeft:'auto', display:'flex', gap:'8px'}}>
            <button className="btn-ghost" style={{padding:'8px 14px',fontSize:'12px'}} onClick={() => setShowCreateVault(true)}>+ New Vault</button>
          </div>
        </div>

        <div className="page-body fade-in">
          {/* STAT CARDS */}
          <div className="grid-4" style={{marginBottom:'28px'}}>
            <div className="stat-card">
              <div className="stat-label">Total Products</div>
              <div className="stat-value gold">{products.length}</div>
              <div className="stat-sub">in this vault</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Warranties</div>
              <div className="stat-value cyan">{products.filter(p => p.warrantyExpiry && new Date(p.warrantyExpiry) > new Date()).length}</div>
              <div className="stat-sub">still covered</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Expiring Soon</div>
              <div className="stat-value" style={{color:'var(--warn)'}}>{expiringSoon.length}</div>
              <div className="stat-sub">within 30 days</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Vault Health</div>
              <div className="stat-value violet">{activeVault?.healthScore ?? 0}%</div>
              <div className="stat-sub">documentation score</div>
            </div>
          </div>

          {/* EXPIRING SOON STRIP */}
          {expiringSoon.length > 0 && (
            <div style={{marginBottom:'28px'}}>
              <div className="label" style={{marginBottom:'12px'}}>⚠ Expiring Soon</div>
              <div style={{display:'flex', gap:'12px', overflowX:'auto', paddingBottom:'4px'}}>
                {expiringSoon.map(p => (
                  <div key={p._id} className="card" style={{minWidth:'180px', flexShrink:0}}>
                    <div style={{fontSize:'13px',fontWeight:600,fontFamily:'Syne,sans-serif'}}>{p.name}</div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'8px'}}>{p.brand}</div>
                    <span className="chip warn" style={{fontSize:'10px'}}>
                      {Math.ceil((new Date(p.warrantyExpiry) - new Date()) / (1000*60*60*24))}d left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
            <div>
              <div className="label">Products</div>
              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'18px',marginTop:'4px'}}>
                {activeVault ? activeVault.name : 'Select a vault'}
              </h2>
            </div>
          </div>

          {products.length === 0 ? (
            <div style={{textAlign:'center', padding:'60px 20px', color:'var(--text-muted)'}}>
              <div style={{fontSize:'48px', marginBottom:'16px'}}>◈</div>
              <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'18px',color:'var(--text-secondary)',marginBottom:'8px'}}>No products yet</div>
              <div style={{fontSize:'14px', marginBottom:'24px'}}>Add your first product to this vault</div>
              <button className="btn-primary" onClick={() => setShowAddProduct(true)}>+ Add Product</button>
            </div>
          ) : (
            <div className="grid-3">
              {products.map(p => (
                <div key={p._id} className="product-card">
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px'}}>
                    <div style={{width:40,height:40,borderRadius:10,background:'var(--gold-dim)',border:'1px solid rgba(232,184,75,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>
                      {p.category === 'Electronics' ? '📱' : p.category === 'Appliance' ? '🏠' : p.category === 'Vehicle' ? '🚗' : '📦'}
                    </div>
                    <button onClick={() => handleDeleteProduct(p._id)}
                      style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'16px',padding:'2px 6px'}}
                      title="Delete">✕</button>
                  </div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-brand">{p.brand || 'Unknown brand'}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    {getWarrantyChip(p.warrantyExpiry)}
                    {p.purchasePrice && <span style={{fontSize:'12px',color:'var(--text-muted)'}}>₹{p.purchasePrice.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAB */}
        {activeVault && <button className="fab" onClick={() => setShowAddProduct(true)}>+</button>}
      </main>

      {/* ADD PRODUCT MODAL */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddProduct(false)}>
          <div className="modal fade-in">
            <div className="modal-title">Add Product</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" placeholder="e.g. Samsung Galaxy S24" required
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input className="form-input" placeholder="Samsung"
                    value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option>Electronics</option>
                    <option>Appliance</option>
                    <option>Vehicle</option>
                    <option>Furniture</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Purchase Price (₹)</label>
                  <input className="form-input" type="number" placeholder="45000"
                    value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Warranty Expiry</label>
                  <input className="form-input" type="date"
                    value={form.warrantyExpiry} onChange={e => setForm({...form, warrantyExpiry: e.target.value})} />
                </div>
              </div>
              <div style={{display:'flex', gap:'12px', marginTop:'8px'}}>
                <button type="button" className="btn-ghost" style={{flex:1}} onClick={() => setShowAddProduct(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{flex:1, justifyContent:'center'}}>Save to Vault →</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE VAULT MODAL */}
      {showCreateVault && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateVault(false)}>
          <div className="modal fade-in">
            <div className="modal-title">Create New Vault</div>
            <form onSubmit={handleCreateVault}>
              <div className="form-group">
                <label className="form-label">Vault Name *</label>
                <input className="form-input" placeholder="e.g. Family Vault" required
                  value={vaultName} onChange={e => setVaultName(e.target.value)} />
              </div>
              <div style={{display:'flex', gap:'12px', marginTop:'8px'}}>
                <button type="button" className="btn-ghost" style={{flex:1}} onClick={() => setShowCreateVault(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{flex:1, justifyContent:'center'}}>Create Vault →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;