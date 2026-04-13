import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { api, uploadBill } from '../services/api';

const WARRANTY_STATUS = (expiry) => {
  if (!expiry) return { label: 'No Warranty', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)' };
  const days = Math.ceil((new Date(expiry) - Date.now()) / 86400000);
  if (days < 0)   return { label: 'Expired',      color: 'var(--danger)', bg: 'rgba(245,75,75,0.1)'  };
  if (days <= 7)  return { label: `${days}d left`, color: 'var(--danger)', bg: 'rgba(245,75,75,0.1)'  };
  if (days <= 30) return { label: `${days}d left`, color: 'var(--gold)',   bg: 'rgba(232,184,75,0.1)' };
  return             { label: 'Active',        color: 'var(--cyan)',   bg: 'rgba(99,202,183,0.1)' };
};

// ── Export single product as HTML → triggers browser print/save as PDF ────────
const exportProductReport = (p) => {
  const ws      = WARRANTY_STATUS(p.warrantyExpiry);
  const billUrl = p.billImageUrl || p.billPdfUrl || '';
  const wUrl    = p.warrantyCardUrl || '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>VaultMERN — ${p.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#fff; color:#111; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:center;
              border-bottom:3px solid #e8b84b; padding-bottom:16px; margin-bottom:24px; }
    .brand { font-size:22px; font-weight:800; color:#e8b84b; letter-spacing:1px; }
    .title { font-size:14px; color:#666; margin-top:2px; }
    .product-name { font-size:24px; font-weight:700; margin-bottom:6px; }
    .meta { font-size:13px; color:#666; margin-bottom:24px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }
    .field { background:#f8f8f8; border-radius:8px; padding:12px 16px; }
    .field-label { font-size:10px; font-weight:700; color:#999; letter-spacing:.08em; margin-bottom:4px; }
    .field-value { font-size:14px; font-weight:600; }
    .status { display:inline-block; padding:4px 14px; border-radius:20px; font-size:12px;
              font-weight:700; background:${ws.color === 'var(--cyan)' ? '#e0f7f4' : ws.color === 'var(--gold)' ? '#fef9e7' : '#fde8e8'};
              color:${ws.color === 'var(--cyan)' ? '#0d9e8a' : ws.color === 'var(--gold)' ? '#b7860b' : '#c0392b'}; }
    .docs-section { margin-top:24px; }
    .docs-title { font-size:13px; font-weight:700; color:#999; letter-spacing:.08em;
                  margin-bottom:14px; border-top:1px solid #eee; padding-top:16px; }
    .doc-row { display:flex; gap:20px; flex-wrap:wrap; }
    .doc-box { flex:1; min-width:200px; border:1px solid #ddd; border-radius:8px;
               overflow:hidden; }
    .doc-label { background:#f0f0f0; padding:8px 12px; font-size:11px; font-weight:700;
                 color:#555; letter-spacing:.06em; }
    .doc-img { width:100%; max-height:300px; object-fit:contain; padding:10px;
               background:#fafafa; display:block; }
    .doc-missing { padding:40px; text-align:center; color:#bbb; font-size:13px;
                   background:#fafafa; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #eee;
              font-size:11px; color:#aaa; display:flex; justify-content:space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">VaultMERN</div>
      <div class="title">Product Document Report</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#999;">Generated on</div>
      <div style="font-size:13px;font-weight:600;">${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
    </div>
  </div>

  <div class="product-name">${p.name}</div>
  <div class="meta">${[p.brand, p.category].filter(Boolean).join(' · ')}
    &nbsp;&nbsp;<span class="status">${ws.label}</span>
  </div>

  <div class="grid">
    <div class="field">
      <div class="field-label">PURCHASE DATE</div>
      <div class="field-value">${p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">PURCHASE PRICE</div>
      <div class="field-value">${p.purchasePrice ? '₹' + p.purchasePrice.toLocaleString() : '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">WARRANTY EXPIRY</div>
      <div class="field-value">${p.warrantyExpiry ? new Date(p.warrantyExpiry).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">SERIAL NUMBER</div>
      <div class="field-value" style="font-family:monospace;font-size:13px;">${p.serialNumber || '—'}</div>
    </div>
  </div>

  <div class="docs-section">
    <div class="docs-title">ATTACHED DOCUMENTS</div>
    <div class="doc-row">
      <div class="doc-box">
        <div class="doc-label">🧾 PURCHASE BILL</div>
        ${billUrl && !billUrl.includes('/raw/')
          ? `<img class="doc-img" src="${billUrl}" alt="Purchase Bill"/>`
          : billUrl
            ? `<div class="doc-missing">PDF Bill attached<br/><a href="${billUrl}" style="color:#e8b84b;font-size:12px;">Open PDF ↗</a></div>`
            : `<div class="doc-missing">Not uploaded</div>`}
      </div>
      <div class="doc-box">
        <div class="doc-label">🛡️ WARRANTY CARD</div>
        ${wUrl && !wUrl.includes('/raw/')
          ? `<img class="doc-img" src="${wUrl}" alt="Warranty Card"/>`
          : wUrl
            ? `<div class="doc-missing">PDF Warranty Card attached<br/><a href="${wUrl}" style="color:#e8b84b;font-size:12px;">Open PDF ↗</a></div>`
            : `<div class="doc-missing">Not uploaded</div>`}
      </div>
    </div>
  </div>

  <div class="footer">
    <span>VaultMERN — Digital Product Ownership Vault</span>
    <span>${p.name} · Report ID: ${p._id}</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
};

// ── Export ALL products as one combined report ────────────────────────────────
const exportAllReport = (products) => {
  const rows = products.map(p => {
    const ws = WARRANTY_STATUS(p.warrantyExpiry);
    return `
    <tr>
      <td>${p.name}</td>
      <td>${p.brand || '—'}</td>
      <td>${p.category || '—'}</td>
      <td>${p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-IN') : '—'}</td>
      <td>${p.purchasePrice ? '₹' + p.purchasePrice.toLocaleString() : '—'}</td>
      <td>${p.warrantyExpiry ? new Date(p.warrantyExpiry).toLocaleDateString('en-IN') : '—'}</td>
      <td><span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;
          background:${ws.color==='var(--cyan)'?'#e0f7f4':ws.color==='var(--gold)'?'#fef9e7':'#fde8e8'};
          color:${ws.color==='var(--cyan)'?'#0d9e8a':ws.color==='var(--gold)'?'#b7860b':'#c0392b'}">
          ${ws.label}</span></td>
      <td style="text-align:center">${p.billImageUrl||p.billPdfUrl ? '✅' : '—'}</td>
      <td style="text-align:center">${p.warrantyCardUrl ? '✅' : '—'}</td>
      <td style="font-family:monospace;font-size:11px">${p.serialNumber || '—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>VaultMERN — Full Product Report</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; background:#fff; color:#111; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:center;
              border-bottom:3px solid #e8b84b; padding-bottom:16px; margin-bottom:28px; }
    .brand { font-size:22px; font-weight:800; color:#e8b84b; }
    .subtitle { font-size:13px; color:#666; margin-top:2px; }
    h2 { font-size:16px; margin-bottom:14px; color:#333; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { background:#f0f0f0; padding:10px 12px; text-align:left; font-size:10px;
         font-weight:700; color:#777; letter-spacing:.06em; border-bottom:2px solid #ddd; }
    td { padding:10px 12px; border-bottom:1px solid #f0f0f0; vertical-align:middle; }
    tr:hover td { background:#fafafa; }
    .footer { margin-top:28px; padding-top:14px; border-top:1px solid #eee;
              font-size:11px; color:#aaa; display:flex; justify-content:space-between; }
    .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
    .stat { background:#f8f8f8; border-radius:8px; padding:14px; text-align:center; }
    .stat-num { font-size:28px; font-weight:700; color:#e8b84b; }
    .stat-label { font-size:11px; color:#999; margin-top:2px; letter-spacing:.06em; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">VaultMERN</div>
      <div class="subtitle">Complete Product & Document Report</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#999;">Generated on</div>
      <div style="font-size:13px;font-weight:600;">${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
    </div>
  </div>

  <div class="summary">
    <div class="stat">
      <div class="stat-num">${products.length}</div>
      <div class="stat-label">TOTAL PRODUCTS</div>
    </div>
    <div class="stat">
      <div class="stat-num">${products.filter(p=>p.billImageUrl||p.billPdfUrl).length}</div>
      <div class="stat-label">BILLS UPLOADED</div>
    </div>
    <div class="stat">
      <div class="stat-num">${products.filter(p=>p.warrantyCardUrl).length}</div>
      <div class="stat-label">WARRANTY CARDS</div>
    </div>
  </div>

  <h2>📦 All Products</h2>
  <table>
    <thead>
      <tr>
        <th>PRODUCT NAME</th>
        <th>BRAND</th>
        <th>CATEGORY</th>
        <th>PURCHASE DATE</th>
        <th>PRICE</th>
        <th>WARRANTY EXPIRY</th>
        <th>STATUS</th>
        <th>BILL</th>
        <th>WARRANTY CARD</th>
        <th>SERIAL NO.</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>VaultMERN — Digital Product Ownership Vault</span>
    <span>Total: ${products.length} products · ${new Date().toLocaleDateString('en-IN')}</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
};

// ── DocCard component ─────────────────────────────────────────────────────────
const DocCard = ({ label, url, icon, onUpload, uploading }) => {
  if (!url) return (
    <div style={{ flex:1, padding:'12px 14px', borderRadius:8,
      background:'rgba(255,255,255,0.02)', border:'1px dashed var(--border)',
      display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:22, opacity:0.25 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>Not uploaded</div>
      </div>
      {onUpload && (
        <button onClick={onUpload} disabled={uploading}
          style={{ fontSize:11, padding:'5px 12px', borderRadius:6, cursor:'pointer',
            background:'rgba(232,184,75,0.15)', color:'var(--gold)',
            border:'1px solid rgba(232,184,75,0.3)', fontWeight:600, whiteSpace:'nowrap' }}>
          {uploading ? '⏳…' : '⬆ Upload'}
        </button>
      )}
    </div>
  );

  const isPdf = url.includes('.pdf') || url.includes('/raw/');
  return (
    <div style={{ flex:1, padding:'12px 14px', borderRadius:8,
      background:'rgba(99,202,183,0.05)', border:'1px solid rgba(99,202,183,0.2)',
      display:'flex', alignItems:'center', gap:10 }}>
      {!isPdf ? (
        <img src={url} alt={label}
          style={{ width:38, height:38, objectFit:'cover', borderRadius:4,
            flexShrink:0, border:'1px solid var(--border)' }} />
      ) : (
        <div style={{ width:38, height:38, borderRadius:4, flexShrink:0,
          background:'rgba(232,184,75,0.1)', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:20 }}>📄</div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:'var(--cyan)', fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{isPdf ? 'PDF' : 'Image'}</div>
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
        <a href={url} target="_blank" rel="noreferrer"
          style={{ fontSize:10, padding:'4px 10px', borderRadius:6,
            background:'rgba(99,202,183,0.15)', color:'var(--cyan)',
            border:'1px solid rgba(99,202,183,0.3)', textDecoration:'none', fontWeight:600 }}>
          👁 View
        </a>
        <a href={url} download
          style={{ fontSize:10, padding:'4px 10px', borderRadius:6,
            background:'rgba(232,184,75,0.15)', color:'var(--gold)',
            border:'1px solid rgba(232,184,75,0.3)', textDecoration:'none', fontWeight:600 }}>
          ⬇ Save
        </a>
        {onUpload && (
          <button onClick={onUpload} disabled={uploading}
            style={{ fontSize:10, padding:'4px 10px', borderRadius:6, cursor:'pointer',
              background:'rgba(255,255,255,0.05)', color:'var(--text-muted)',
              border:'1px solid var(--border)', fontWeight:600 }}>
            🔄
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const BillHistory = () => {
  const warrantyInputRef = useRef({});
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [uploading, setUploading] = useState({});
  const [uploadMsg, setUploadMsg] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const vaults = await api('/vaults/my');
      if (!vaults || vaults.length === 0) {
        setError('No vault found. Create a vault first.');
        setLoading(false); return;
      }
      const data = await api(`/products?vaultId=${vaults[0]._id}`);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWarrantyUpload = async (productId, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [productId]: true }));
    setUploadMsg(prev => ({ ...prev, [productId]: '' }));
    try {
      const data           = await uploadBill(file);
      const warrantyCardUrl = data.url;
      await api(`/products/${productId}`, 'PUT', { warrantyCardUrl });
      setProducts(prev => prev.map(p =>
        p._id === productId ? { ...p, warrantyCardUrl } : p
      ));
      setUploadMsg(prev => ({ ...prev, [productId]: 'success' }));
      setTimeout(() => setUploadMsg(prev => ({ ...prev, [productId]: '' })), 3000);
    } catch (err) {
      setUploadMsg(prev => ({ ...prev, [productId]: 'error' }));
    } finally {
      setUploading(prev => ({ ...prev, [productId]: false }));
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'          ? true :
      filter === 'has-bill'     ? !!(p.billImageUrl || p.billPdfUrl) :
      filter === 'has-warranty' ? !!p.warrantyCardUrl : true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>DOCUMENT VAULT</p>
            <h1>Bills & Warranty History</h1>
            <p>View, download, and export all your product documents</p>
          </div>
          {/* Export all button */}
          {products.length > 0 && (
            <button className="btn-primary"
              style={{ alignSelf:'flex-start' }}
              onClick={() => exportAllReport(products)}>
              📄 Export All Report
            </button>
          )}
        </div>

        {error && (
          <div style={{ background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)',
            borderRadius:8, padding:'12px 16px', color:'var(--danger)', fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Search + filters */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          <input className="input-field"
            style={{ flex:1, minWidth:200, maxWidth:340 }}
            placeholder="🔍 Search products…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[
              { key:'all',          label:'All' },
              { key:'has-bill',     label:'🧾 Has Bill' },
              { key:'has-warranty', label:'🛡️ Has Warranty Card' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding:'6px 14px', borderRadius:20, fontSize:12,
                  fontWeight:600, cursor:'pointer', border:'1px solid',
                  background: filter===f.key ? 'var(--gold)' : 'transparent',
                  color:      filter===f.key ? '#000'        : 'var(--text-muted)',
                  borderColor:filter===f.key ? 'var(--gold)' : 'var(--border)',
                  transition:'all 0.2s' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            {[
              { label:'Total Products', value:products.length,                                         icon:'📦' },
              { label:'Bills Uploaded', value:products.filter(p=>p.billImageUrl||p.billPdfUrl).length, icon:'🧾' },
              { label:'Warranty Cards', value:products.filter(p=>p.warrantyCardUrl).length,            icon:'🛡️' },
            ].map(s => (
              <div key={s.label} className="card" style={{ flex:1, textAlign:'center', padding:'14px 10px' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'Syne,sans-serif' }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.06em' }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product list */}
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>Loading documents…
          </div>
        ) : filtered.length === 0 && !error ? (
          <div className="card" style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🗂️</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>
              {products.length === 0 ? 'No products yet' : 'No products match your filter'}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>
              {products.length === 0 ? 'Scan a bill to add your first product.' : 'Try a different filter.'}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(p => {
              const ws = WARRANTY_STATUS(p.warrantyExpiry);
              return (
                <div key={p._id} className="card" style={{ padding:'18px 20px' }}>

                  {/* Hidden file input per product */}
                  <input type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display:'none' }}
                    ref={el => warrantyInputRef.current[p._id] = el}
                    onChange={e => { handleWarrantyUpload(p._id, e.target.files[0]); e.target.value=''; }}
                  />

                  {/* Product header */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
                    <div style={{ width:44, height:44, borderRadius:10, flexShrink:0,
                      background:'rgba(232,184,75,0.1)', border:'1px solid rgba(232,184,75,0.2)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                      {p.category==='Electronics'?'📱':p.category==='Appliance'?'🏠':
                       p.category==='Vehicle'?'🚗':p.category==='Furniture'?'🪑':'📦'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, marginBottom:2 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {[p.brand, p.category,
                          p.purchaseDate && new Date(p.purchaseDate).toLocaleDateString('en-IN')]
                          .filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {/* Per-product export button */}
                      <button
                        onClick={() => exportProductReport(p)}
                        title="Export this product as PDF"
                        style={{ fontSize:11, padding:'5px 12px', borderRadius:6, cursor:'pointer',
                          background:'rgba(99,202,183,0.12)', color:'var(--cyan)',
                          border:'1px solid rgba(99,202,183,0.3)', fontWeight:600, whiteSpace:'nowrap' }}>
                        📄 Export
                      </button>
                      <div style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700,
                        background:ws.bg, color:ws.color, border:`1px solid ${ws.color}40`, whiteSpace:'nowrap' }}>
                        {ws.label}
                      </div>
                    </div>
                  </div>

                  {/* Warranty info */}
                  {p.warrantyExpiry && (
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12, paddingLeft:58 }}>
                      🛡️ Warranty expires: <strong style={{ color:ws.color }}>
                        {new Date(p.warrantyExpiry).toLocaleDateString('en-IN',
                          { day:'numeric', month:'long', year:'numeric' })}
                      </strong>
                      {p.serialNumber && <> · Serial: <code style={{ fontSize:11 }}>{p.serialNumber}</code></>}
                    </div>
                  )}

                  {/* Upload feedback */}
                  {uploadMsg[p._id] === 'success' && (
                    <div style={{ fontSize:12, color:'var(--cyan)', marginBottom:10,
                      background:'rgba(99,202,183,0.08)', border:'1px solid rgba(99,202,183,0.2)',
                      borderRadius:6, padding:'6px 12px' }}>
                      ✅ Warranty card uploaded successfully!
                    </div>
                  )}
                  {uploadMsg[p._id] === 'error' && (
                    <div style={{ fontSize:12, color:'var(--danger)', marginBottom:10,
                      background:'rgba(245,75,75,0.08)', border:'1px solid rgba(245,75,75,0.2)',
                      borderRadius:6, padding:'6px 12px' }}>
                      ❌ Upload failed. Please try again.
                    </div>
                  )}

                  {/* Document cards */}
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    <DocCard
                      label="Purchase Bill"
                      url={p.billImageUrl || p.billPdfUrl}
                      icon="🧾"
                    />
                    <DocCard
                      label="Warranty Card"
                      url={p.warrantyCardUrl}
                      icon="🛡️"
                      uploading={uploading[p._id]}
                      onUpload={() => warrantyInputRef.current[p._id]?.click()}
                    />
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
};

export default BillHistory;