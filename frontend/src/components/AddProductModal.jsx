import { useState } from 'react';
import { api } from '../services/api';

const CATEGORIES = ['Electronics', 'Appliance', 'Vehicle', 'Furniture', 'Other'];

const AddProductModal = ({ vaultId, onClose, onAdded, prefill = {} }) => {
  const [form, setForm] = useState({
    name:           prefill.name || '',
    brand:          prefill.brand || '',
    category:       prefill.category || 'Electronics',
    purchaseDate:   prefill.purchaseDate || '',
    purchasePrice:  prefill.purchasePrice || '',
    warrantyExpiry: prefill.warrantyExpiry || '',
    serialNumber:   prefill.serialNumber || '',
    notes:          prefill.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    setLoading(true); setError('');
    try {
      const product = await api('/products', 'POST', {
        vaultId,
        ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
      });
      onAdded(product);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, backdropFilter:'blur(2px)' }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:'100%', maxWidth:540, background:'var(--panel)',
        border:'1px solid var(--border)', borderRadius:16, padding:28,
        zIndex:201, maxHeight:'90vh', overflowY:'auto',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <p className="label" style={{ marginBottom:4 }}>NEW PRODUCT</p>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800 }}>Add to Vault</h3>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)', marginBottom:14 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <div className="input-label">PRODUCT NAME *</div>
          <input className="input-field" placeholder="e.g. iPhone 15 Pro" value={form.name} onChange={set('name')} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group">
            <div className="input-label">BRAND</div>
            <input className="input-field" placeholder="e.g. Apple" value={form.brand} onChange={set('brand')} />
          </div>
          <div className="form-group">
            <div className="input-label">CATEGORY</div>
            <select className="input-field" value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group">
            <div className="input-label">PURCHASE DATE</div>
            <input className="input-field" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} />
          </div>
          <div className="form-group">
            <div className="input-label">PURCHASE PRICE (₹)</div>
            <input className="input-field" type="number" placeholder="0" value={form.purchasePrice} onChange={set('purchasePrice')} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group">
            <div className="input-label">WARRANTY EXPIRY</div>
            <input className="input-field" type="date" value={form.warrantyExpiry} onChange={set('warrantyExpiry')} />
          </div>
          <div className="form-group">
            <div className="input-label">SERIAL NUMBER</div>
            <input className="input-field" placeholder="SN / IMEI" value={form.serialNumber} onChange={set('serialNumber')} />
          </div>
        </div>

        <div className="form-group">
          <div className="input-label">NOTES</div>
          <textarea className="input-field" style={{ height:60, resize:'none' }}
            placeholder="Any extra details…" value={form.notes} onChange={set('notes')} />
        </div>

        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button className="btn-primary" style={{ flex:1, justifyContent:'center' }}
            onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : '💾 Save to Vault'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  );
};

export default AddProductModal;