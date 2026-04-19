import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ProductDetailDrawer from '../components/ProductDetailDrawer';
import EditProductModal from '../components/EditProductModal';
import AddProductModal from '../components/AddProductModal';
import GeoAlertBanner from '../components/GeoAlertBanner';
import WarrantyChip from '../components/WarrantyChip';
import { api } from '../services/api';
import { useVault } from '../context/VaultContext';

const CATEGORIES = ['All', 'Electronics', 'Appliance', 'Vehicle', 'Furniture', 'Other'];
const CAT_EMOJI  = { Electronics:'📺', Appliance:'🧊', Vehicle:'🚗', Furniture:'🛋️', Other:'📦' };

const Products = () => {
  const navigate = useNavigate();
  const { vaults, activeVault, switchVault } = useVault();

  const [products, setProducts] = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [loading,  setLoading]  = useState(false);

  // Filters
  const [search,         setSearch]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter,    setBrandFilter]    = useState('All');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [sortBy,         setSortBy]         = useState('newest');
  const [viewMode,       setViewMode]       = useState('grid');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct,  setEditingProduct]  = useState(null);
  const [showAddModal,    setShowAddModal]    = useState(false);



// Safety fallback — if context vault not ready, load from API directly
useEffect(() => {
  if (activeVault?._id || vaults.length === 0) return;
  // context hasn't hydrated yet, wait 500ms and try again
  const t = setTimeout(() => {
    if (!activeVault?._id && vaults.length > 0) {
      loadProducts(vaults[0]._id);
    }
  }, 500);
  return () => clearTimeout(t);
}, [vaults]);

 const loadProducts = async (vaultId) => {
  try {
    setLoading(true);
    // Fetch products and brands separately so one failure doesn't kill both
    const prods = await api(`/products?vaultId=${vaultId}`);
    setProducts(prods);
    try {
      const brandList = await api(`/products/brands?vaultId=${vaultId}`);
      setBrands(brandList);
    } catch {
      // brands endpoint failed — extract brands from products client-side as fallback
      const b = [...new Set(prods.map(p => p.brand).filter(Boolean))].sort();
      setBrands(b);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (!activeVault?._id) return;
  loadProducts(activeVault._id);
}, [activeVault?._id]);

  const now = new Date();

  const getWarrantyStatus = (exp) => {
    if (!exp) return 'none';
    const d = Math.floor((new Date(exp) - now) / 86400000);
    if (d < 0)   return 'expired';
    if (d <= 30) return 'expiring';
    return 'active';
  };

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      if (q && !p.name?.toLowerCase().includes(q) && !p.brand?.toLowerCase().includes(q) && !p.notes?.toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (brandFilter !== 'All' && p.brand?.toLowerCase() !== brandFilter.toLowerCase()) return false;
      if (statusFilter !== 'All') {
        const s = getWarrantyStatus(p.warrantyExpiry);
        if (statusFilter === 'Active'   && s !== 'active')   return false;
        if (statusFilter === 'Expiring' && s !== 'expiring') return false;
        if (statusFilter === 'Expired'  && s !== 'expired')  return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')     return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest')     return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'price-high') return (b.purchasePrice || 0) - (a.purchasePrice || 0);
      if (sortBy === 'price-low')  return (a.purchasePrice || 0) - (b.purchasePrice || 0);
      if (sortBy === 'name')       return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'warranty')   return new Date(a.warrantyExpiry || '9999') - new Date(b.warrantyExpiry || '9999');
      return 0;
    });

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api(`/products/${product._id}`, 'DELETE');
      setProducts(prev => prev.filter(p => p._id !== product._id));
      setSelectedProduct(null);
    } catch (err) { alert(err.message); }
  };

  const handleSaved = (updated) => {
    setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
    setSelectedProduct(updated);
  };

  const handleAdded = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
    if (newProduct.brand && !brands.includes(newProduct.brand))
      setBrands(prev => [...prev, newProduct.brand].sort());
  };

  const clearFilters = () => {
    setSearch(''); setCategoryFilter('All'); setBrandFilter('All'); setStatusFilter('All');
  };
  const hasFilters = search || categoryFilter !== 'All' || brandFilter !== 'All' || statusFilter !== 'All';

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* PAGE HEADER */}
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>PRODUCT CATALOGUE</p>
            <h1>All Products</h1>
            {/* VAULT SWITCHER */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, flexWrap:'wrap' }}>
              {vaults.map(v => (
                <button
                  key={v._id}
                  onClick={() => switchVault(v)}
                  style={{
                    padding:'4px 12px', borderRadius:20, fontSize:11, cursor:'pointer',
                    background:    activeVault?._id === v._id ? 'var(--gold)'   : 'var(--deep)',
                    color:         activeVault?._id === v._id ? 'var(--void)'   : 'var(--text-muted)',
                    border:       `1px solid ${activeVault?._id === v._id ? 'var(--gold)' : 'var(--border)'}`,
                    fontWeight:    activeVault?._id === v._id ? 700 : 400,
                    transition:   'all 0.15s',
                  }}
                >
                  🏠 {v.name}
                </button>
              ))}
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                {products.length} products · {filtered.length} showing
              </span>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-ghost" style={{ fontSize:18, padding:'10px 14px' }}
              title="Toggle view" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? '☰' : '⊞'}
            </button>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Product</button>
            <button className="btn-ghost"  onClick={() => navigate('/scan')}>📷 Scan Bill</button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input-field" style={{ maxWidth:240, flex:'1 1 180px' }}
            placeholder="🔍 Search name, brand, notes…"
            value={search} onChange={e => setSearch(e.target.value)} />

          {/* Category chips */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                background:  categoryFilter === cat ? 'var(--gold)' : 'var(--deep)',
                color:       categoryFilter === cat ? 'var(--void)' : 'var(--text-muted)',
                border:     `1px solid ${categoryFilter === cat ? 'var(--gold)' : 'var(--border)'}`,
                fontWeight:  categoryFilter === cat ? 700 : 400,
                transition: 'all 0.15s',
              }}>
                {cat !== 'All' && CAT_EMOJI[cat] ? `${CAT_EMOJI[cat]} ` : ''}{cat}
              </button>
            ))}
          </div>

          {/* Brand dropdown */}
          {brands.length > 0 && (
            <select className="input-field" style={{ maxWidth:150 }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="All">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}

          {/* Warranty status toggle */}
          <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
            {['All','Active','Expiring','Expired'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding:'7px 12px', fontSize:11, cursor:'pointer', border:'none',
                background: statusFilter === s ? 'var(--cyan)' : 'var(--deep)',
                color:      statusFilter === s ? 'var(--void)' : 'var(--text-muted)',
                fontWeight: statusFilter === s ? 700 : 400,
                transition: 'all 0.15s',
              }}>{s}</button>
            ))}
          </div>

          {/* Sort */}
          <select className="input-field" style={{ maxWidth:160 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="price-high">Sort: Price ↓</option>
            <option value="price-low">Sort: Price ↑</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="warranty">Sort: Warranty ↑</option>
          </select>

          {hasFilters && (
            <button className="btn-ghost" style={{ fontSize:12, padding:'8px 12px' }} onClick={clearFilters}>
              Clear ✕
            </button>
          )}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
            <p>Loading products…</p>
          </div>
        ) : !activeVault ? (
          <div className="card-glint" style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🏠</div>
            <h3 style={{ fontFamily:'Syne,sans-serif', marginBottom:8 }}>No vault selected</h3>
            <p style={{ color:'var(--text-muted)', marginBottom:20 }}>Go to Vault Mgmt to create your first vault.</p>
            <button className="btn-primary" onClick={() => navigate('/vault')}>Go to Vault Mgmt</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-glint" style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>{products.length === 0 ? '📦' : '🔍'}</div>
            <h3 style={{ fontFamily:'Syne,sans-serif', marginBottom:8 }}>
              {products.length === 0 ? 'No products yet' : 'No results found'}
            </h3>
            <p style={{ color:'var(--text-muted)', marginBottom:20 }}>
              {products.length === 0
                ? `No products in "${activeVault.name}" yet.`
                : 'Try adjusting your filters.'}
            </p>
            {products.length === 0 && (
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Product</button>
                <button className="btn-ghost"   onClick={() => navigate('/scan')}>📷 Scan Bill</button>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <ProductGrid
            products={filtered}
            onSelect={setSelectedProduct}
            getWarrantyStatus={getWarrantyStatus}
            now={now}
          />
        ) : (
          <ProductTable
            products={filtered}
            onSelect={setSelectedProduct}
            now={now}
          />
        )}

        {/* GEO ALERTS */}
        {activeVault && (
          <GeoAlertBanner vaultId={activeVault._id} products={products} />
        )}

      </main>

      {selectedProduct && (
        <ProductDetailDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={p => { setEditingProduct(p); setSelectedProduct(null); }}
          onDelete={handleDelete}
        />
      )}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={handleSaved}
        />
      )}
      {showAddModal && activeVault && (
        <AddProductModal
          vaultId={activeVault._id}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
};

/* ── Grid View ─────────────────────────────────────────────────── */
const ProductGrid = ({ products, onSelect, getWarrantyStatus, now }) => (
  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16, marginBottom:24 }}>
    {products.map(p => {
      const status = getWarrantyStatus(p.warrantyExpiry);
      const borderAccent = status === 'expired' ? 'rgba(245,75,75,0.4)' : status === 'expiring' ? 'rgba(245,160,75,0.4)' : undefined;
      return (
        <div key={p._id} className="card" onClick={() => onSelect(p)}
          style={{ cursor:'pointer', transition:'transform 0.15s, border-color 0.15s', borderColor:borderAccent }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; if (!borderAccent) e.currentTarget.style.borderColor = 'var(--cyan)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; if (!borderAccent) e.currentTarget.style.borderColor = ''; }}>
          <div style={{ fontSize:40, textAlign:'center', marginBottom:12, background:'var(--deep)', borderRadius:12, padding:'14px 0' }}>
            {CAT_EMOJI[p.category] || '📦'}
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, marginBottom:3, lineHeight:1.3 }}>{p.name}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>{p.brand || 'Unknown brand'} · {p.category}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--gold)' }}>
              {p.purchasePrice ? `₹${p.purchasePrice.toLocaleString()}` : '—'}
            </span>
            <WarrantyChip warrantyExpiry={p.warrantyExpiry} />
          </div>
          {p.purchaseDate && (
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>
              Purchased {new Date(p.purchaseDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
            </div>
          )}
          {p.warrantyExpiry && p.purchaseDate && (() => {
            const total = new Date(p.warrantyExpiry) - new Date(p.purchaseDate);
            const pct   = Math.min(100, Math.max(0, ((now - new Date(p.purchaseDate)) / total) * 100));
            return (
              <div className="progress-bar" style={{ marginTop:10 }}>
                <div className="progress-fill" style={{
                  width:`${100 - pct}%`,
                  background: status === 'expired' ? 'var(--danger)' : status === 'expiring' ? 'var(--warn)' : undefined,
                }} />
              </div>
            );
          })()}
        </div>
      );
    })}
  </div>
);

/* ── List / Table View ─────────────────────────────────────────── */
const ProductTable = ({ products, onSelect, now }) => (
  <div className="card-glint" style={{ marginBottom:24 }}>
    <table className="data-table">
      <thead>
        <tr>
          <th>PRODUCT</th><th>BRAND</th><th>PURCHASE DATE</th><th>PRICE</th><th>WARRANTY</th><th>STATUS</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p._id} onClick={() => onSelect(p)} style={{ cursor:'pointer' }}>
            <td>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{CAT_EMOJI[p.category] || '📦'}</span>
                <div>
                  <div style={{ fontWeight:600 }}>{p.name}</div>
                  {p.serialNumber && <div style={{ fontSize:10, color:'var(--text-muted)' }}>SN: {p.serialNumber}</div>}
                </div>
              </div>
            </td>
            <td>{p.brand || '—'}</td>
            <td>{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-IN') : '—'}</td>
            <td>{p.purchasePrice ? `₹${p.purchasePrice.toLocaleString()}` : '—'}</td>
            <td>
              {p.warrantyExpiry && p.purchaseDate ? (() => {
                const total = new Date(p.warrantyExpiry) - new Date(p.purchaseDate);
                const pct   = Math.min(100, Math.max(0, ((now - new Date(p.purchaseDate)) / total) * 100));
                return (
                  <div>
                    <div style={{ fontSize:12, marginBottom:4 }}>{new Date(p.warrantyExpiry).toLocaleDateString('en-IN')}</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width:`${100 - pct}%` }} /></div>
                  </div>
                );
              })() : (p.warrantyExpiry ? new Date(p.warrantyExpiry).toLocaleDateString('en-IN') : '—')}
            </td>
            <td><WarrantyChip warrantyExpiry={p.warrantyExpiry} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Products;