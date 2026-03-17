import { useState, useEffect } from 'react';
import { api } from '../services/api';

const ProductDetailDrawer = ({ product, onClose, onEdit, onDelete }) => {
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ serviceDate: '', description: '', cost: '', providerName: '' });
  const [savingService, setSavingService] = useState(false);

  useEffect(() => {
    if (product) loadHistory();
  }, [product]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await api(`/products/${product._id}/service`);
      setServiceHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddService = async () => {
    if (!serviceForm.description || !serviceForm.serviceDate) return;
    setSavingService(true);
    try {
      await api(`/products/${product._id}/service`, 'POST', {
        ...serviceForm,
        cost: Number(serviceForm.cost) || 0,
      });
      setServiceForm({ serviceDate: '', description: '', cost: '', providerName: '' });
      setShowAddService(false);
      loadHistory();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (entryId) => {
    if (!confirm('Delete this service entry?')) return;
    try {
      await api(`/products/${product._id}/service/${entryId}`, 'DELETE');
      loadHistory();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!product) return null;

  const now = new Date();
  const getCategoryEmoji = (cat) => ({ Electronics: '📺', Appliance: '🧊', Vehicle: '🚗', Furniture: '🛋️' }[cat] || '📦');

  const getWarrantyChip = (exp) => {
    if (!exp) return <span className="chip" style={{ background: 'var(--deep)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>No warranty</span>;
    const days = Math.floor((new Date(exp) - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="chip danger">Expired</span>;
    if (days <= 7) return <span className="chip danger">{days}d left</span>;
    if (days <= 30) return <span className="chip warn">{days}d left</span>;
    return <span className="chip green">Active · {Math.floor(days / 30)}mo left</span>;
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 100, backdropFilter: 'blur(2px)'
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480,
        background: 'var(--panel)', borderLeft: '1px solid var(--border)',
        zIndex: 101, overflowY: 'auto', padding: 28,
        animation: 'slideIn 0.25s ease'
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 40 }}>{getCategoryEmoji(product.category)}</span>
            <div>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{product.name}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{product.brand} · {product.category}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Warranty status */}
        <div style={{ marginBottom: 20 }}>
          {getWarrantyChip(product.warrantyExpiry)}
        </div>

        {/* Product Info Grid */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="label" style={{ marginBottom: 14 }}>PRODUCT INFO</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Purchase Date', value: product.purchaseDate ? new Date(product.purchaseDate).toLocaleDateString() : '—' },
              { label: 'Purchase Price', value: product.purchasePrice ? `₹${product.purchasePrice.toLocaleString()}` : '—' },
              { label: 'Warranty Expiry', value: product.warrantyExpiry ? new Date(product.warrantyExpiry).toLocaleDateString() : '—' },
              { label: 'Serial Number', value: product.serialNumber || '—' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label.toUpperCase()}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
          {product.notes && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>NOTES</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{product.notes}</div>
            </div>
          )}
        </div>

        {/* Service History */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p className="label">SERVICE HISTORY</p>
            <button className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setShowAddService(!showAddService)}>
              {showAddService ? 'Cancel' : '+ Add Entry'}
            </button>
          </div>

          {showAddService && (
            <div style={{ background: 'var(--deep)', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid var(--border)' }}>
              <div className="form-group">
                <div className="input-label">SERVICE DATE *</div>
                <input className="input-field" type="date" value={serviceForm.serviceDate}
                  onChange={e => setServiceForm({ ...serviceForm, serviceDate: e.target.value })} />
              </div>
              <div className="form-group">
                <div className="input-label">DESCRIPTION *</div>
                <textarea className="input-field" style={{ height: 60, resize: 'none' }}
                  placeholder="e.g. Screen replacement, annual servicing..."
                  value={serviceForm.description}
                  onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <div className="input-label">COST (₹)</div>
                  <input className="input-field" type="number" placeholder="0"
                    value={serviceForm.cost}
                    onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })} />
                </div>
                <div className="form-group">
                  <div className="input-label">PROVIDER</div>
                  <input className="input-field" placeholder="Service center name"
                    value={serviceForm.providerName}
                    onChange={e => setServiceForm({ ...serviceForm, providerName: e.target.value })} />
                </div>
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
                onClick={handleAddService} disabled={savingService}>
                {savingService ? 'Saving...' : '💾 Save Entry'}
              </button>
            </div>
          )}

          {loadingHistory ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Loading history...</p>
          ) : serviceHistory.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No service records yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {serviceHistory.map((entry, idx) => (
                <div key={entry._id} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
                  {/* Timeline line */}
                  {idx < serviceHistory.length - 1 && (
                    <div style={{ position: 'absolute', left: 7, top: 18, bottom: 0, width: 2, background: 'var(--border)' }} />
                  )}
                  {/* Dot */}
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0, marginTop: 2, border: '2px solid var(--deep)', zIndex: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{entry.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(entry.serviceDate).toLocaleDateString()}
                          {entry.providerName && ` · ${entry.providerName}`}
                          {entry.cost > 0 && <span style={{ color: 'var(--warn)', marginLeft: 6 }}>₹{entry.cost.toLocaleString()}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteService(entry._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit(product)}>✏️ Edit Product</button>
          <button className="btn-ghost" style={{ borderColor: 'rgba(245,75,75,0.3)', color: 'var(--danger)' }}
            onClick={() => onDelete(product)}>🗑 Delete</button>
        </div>
      </div>
    </>
  );
};

export default ProductDetailDrawer;