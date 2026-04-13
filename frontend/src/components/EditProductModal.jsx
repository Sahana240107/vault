import { useState } from 'react';
import { api } from '../services/api';

const EditProductModal = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: product.name || '',
    brand: product.brand || '',
    category: product.category || 'Electronics',
    purchaseDate: product.purchaseDate ? product.purchaseDate.slice(0, 10) : '',
    purchasePrice: product.purchasePrice || '',
    warrantyExpiry: product.warrantyExpiry ? product.warrantyExpiry.slice(0, 10) : '',
    serialNumber: product.serialNumber || '',
    notes: product.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name) { setError('Product name is required.'); return; }
    setLoading(true); setError('');
    try {
      const updated = await api(`/products/${product._id}`, 'PUT', {
        ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 520, background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 16, padding: 28,
        zIndex: 201, maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p className="label" style={{ marginBottom: 4 }}>EDIT PRODUCT</p>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800 }}>{product.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(245,75,75,0.1)', border: '1px solid rgba(245,75,75,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <div className="input-label">PRODUCT NAME *</div>
          <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <div className="input-label">BRAND</div>
            <input className="input-field" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div className="form-group">
            <div className="input-label">CATEGORY</div>
            <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option>Electronics</option>
              <option>Appliance</option>
              <option>Vehicle</option>
              <option>Furniture</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <div className="input-label">PURCHASE DATE</div>
            <input className="input-field" type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div className="form-group">
            <div className="input-label">PURCHASE PRICE (₹)</div>
            <input className="input-field" type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <div className="input-label">WARRANTY EXPIRY</div>
            <input className="input-field" type="date" value={form.warrantyExpiry} onChange={e => setForm({ ...form, warrantyExpiry: e.target.value })} />
          </div>
          <div className="form-group">
            <div className="input-label">SERIAL NUMBER</div>
            <input className="input-field" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <div className="input-label">NOTES</div>
          <textarea className="input-field" style={{ height: 60, resize: 'none' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : '💾 Save Changes'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  );
};

export default EditProductModal;