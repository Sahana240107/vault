import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

const Scan = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'',brand:'',category:'Electronics',purchaseDate:'',purchasePrice:'',warrantyExpiry:'',serialNumber:'',notes:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const vaults = await api('/vaults/my');
      if (vaults.length === 0) {
        await api('/vaults', 'POST', { name: 'My Vault' });
        const newVaults = await api('/vaults/my');
        await api('/products', 'POST', { ...form, vaultId: newVaults[0]._id });
      } else {
        await api('/products', 'POST', { ...form, vaultId: vaults[0]._id });
      }
      navigate('/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>AI-POWERED ENTRY</p>
            <h1>Scan Bill / Add Product</h1>
            <p>Upload a receipt — AI fills the form automatically</p>
          </div>
        </div>

        <div className="grid-2">
          {/* LEFT: SCAN ZONE */}
          <div>
            <div className="scan-zone" style={{ position:'relative',height:260,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
              <div className="scan-line"></div>
              <span style={{ fontSize:48,marginBottom:12,display:'block' }}>🧾</span>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,marginBottom:6 }}>Drop Receipt Here</h3>
              <p style={{ fontSize:13,color:'var(--text-muted)' }}>Supports JPG, PNG, PDF · Max 10MB</p>
              <button className="btn-primary" style={{ marginTop:16 }}>📂 Browse Files</button>
            </div>

            <div className="card" style={{ marginTop:16,borderColor:'var(--cyan)',background:'var(--cyan-dim)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span style={{ fontSize:20 }}>🤖</span>
                <div>
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--cyan)' }}>AI OCR Ready</div>
                  <div style={{ fontSize:11,color:'var(--text-muted)' }}>Tesseract.js · Extracts name, price, date, warranty</div>
                </div>
                <span className="annot" style={{ marginLeft:'auto' }}>LIVE</span>
              </div>
            </div>
          </div>

          {/* RIGHT: FORM */}
          <div className="card-glint">
            <p className="label" style={{ marginBottom:16 }}>PRODUCT DETAILS FORM</p>
            {error && <div style={{ background:'rgba(245,75,75,0.1)',border:'1px solid rgba(245,75,75,0.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--danger)',marginBottom:16 }}>{error}</div>}
            <div className="form-group">
              <div className="input-label">PRODUCT NAME *</div>
              <input className="input-field" placeholder="e.g. Samsung TV 55&quot;" value={form.name} onChange={e => setForm({...form,name:e.target.value})} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <div className="input-label">BRAND *</div>
                <input className="input-field" placeholder="e.g. Samsung" value={form.brand} onChange={e => setForm({...form,brand:e.target.value})} />
              </div>
              <div className="form-group">
                <div className="input-label">CATEGORY *</div>
                <select className="input-field" value={form.category} onChange={e => setForm({...form,category:e.target.value})}>
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
                <div className="input-label">PURCHASE DATE</div>
                <input className="input-field" type="date" value={form.purchaseDate} onChange={e => setForm({...form,purchaseDate:e.target.value})} />
              </div>
              <div className="form-group">
                <div className="input-label">PURCHASE PRICE (₹)</div>
                <input className="input-field" type="number" placeholder="e.g. 45000" value={form.purchasePrice} onChange={e => setForm({...form,purchasePrice:e.target.value})} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <div className="input-label">WARRANTY EXPIRY</div>
                <input className="input-field" type="date" value={form.warrantyExpiry} onChange={e => setForm({...form,warrantyExpiry:e.target.value})} />
              </div>
              <div className="form-group">
                <div className="input-label">SERIAL NUMBER</div>
                <input className="input-field" placeholder="Optional" value={form.serialNumber} onChange={e => setForm({...form,serialNumber:e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <div className="input-label">NOTES</div>
              <textarea className="input-field" style={{ height:60,resize:'none' }} placeholder="Any additional notes…" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
            </div>
            <div style={{ display:'flex',gap:10,marginTop:8 }}>
              <button className="btn-primary" style={{ flex:1,justifyContent:'center' }} onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : '💾 Save Product'}
              </button>
              <button className="btn-ghost" onClick={() => setForm({ name:'',brand:'',category:'Electronics',purchaseDate:'',purchasePrice:'',warrantyExpiry:'',serialNumber:'',notes:'' })}>Reset</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Scan;