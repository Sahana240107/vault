import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { api, uploadBill } from '../services/api';

const EMPTY_FORM = {
  name: '', brand: '', category: 'Electronics',
  purchaseDate: '', purchasePrice: '', warrantyExpiry: '',
  serialNumber: '', notes: '',
};

const Scan = () => {
  const navigate    = useNavigate();
  const fileRef     = useRef(null);
  const warrantyRef = useRef(null);

  const [dragOver,         setDragOver]         = useState(false);
  const [warrantyDragOver, setWarrantyDragOver] = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [billUrl,     setBillUrl]     = useState('');
  const [billType,    setBillType]    = useState('');
  const [preview,     setPreview]     = useState('');
  const [ocrStatus,   setOcrStatus]   = useState('idle');
  const [saveLoading, setSaveLoading] = useState(false);
  const [error,       setError]       = useState('');
  const [ocrItems,    setOcrItems]    = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [warrantyPreview, setWarrantyPreview] = useState('');
  const [warrantyUrl,     setWarrantyUrl]     = useState('');
  const [warrantyStatus,  setWarrantyStatus]  = useState('idle');
  const [warrantySrc,     setWarrantySrc]     = useState('');
  const [warrantyOcrResult, setWarrantyOcrResult] = useState(null);

  // ── Vault selector state ──
  const [vaults,          setVaults]          = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState('');
  const [vaultsLoading,   setVaultsLoading]   = useState(true);

  useEffect(() => {
    const loadVaults = async () => {
      try {
        const data = await api('/vaults/my');
        setVaults(data);
        const savedId = localStorage.getItem('activeVaultId');
        const found   = data.find(v => v._id === savedId);
        setSelectedVaultId((found || data[0])?._id || '');
      } catch (err) {
        console.error('Could not load vaults:', err);
      } finally {
        setVaultsLoading(false);
      }
    };
    loadVaults();
  }, []);

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const applyOcrItem = (item) => {
    setForm(prev => ({
      ...prev,
      name:           item.name          || prev.name,
      brand:          item.brand         || prev.brand,
      category:       item.category      || prev.category,
      purchaseDate:   item.purchaseDate  || prev.purchaseDate,
      purchasePrice:  item.purchasePrice != null ? String(item.purchasePrice) : prev.purchasePrice,
      warrantyExpiry: item.warrantyExpiry || prev.warrantyExpiry,
      serialNumber:   item.serialNumber  || prev.serialNumber,
    }));
    if (item.warrantyExpiry) setWarrantySrc('bill-ocr');
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError(''); setOcrStatus('uploading');
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = e => setPreview(e.target.result);
      r.readAsDataURL(file);
    } else setPreview('');
    try {
      const data = await uploadBill(file);
      setBillUrl(data.url); setBillType(data.type);
      const items = Array.isArray(data.ocr) ? data.ocr : data.ocr ? [data.ocr] : [];
      if (items.length > 0) {
        setOcrItems(items);
        if (items.length === 1) { applyOcrItem(items[0]); setSelectedIdx(0); }
        else setSelectedIdx(null);
      }
      setOcrStatus('done');
    } catch (err) {
      setOcrStatus('error');
      setError('Upload failed: ' + err.message);
    }
  };

  const handleWarrantyFile = async (file) => {
    if (!file) return;
    setWarrantyStatus('uploading'); setWarrantyOcrResult(null);
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = e => setWarrantyPreview(e.target.result);
      r.readAsDataURL(file);
    } else setWarrantyPreview('');
    try {
      const data = await uploadBill(file);
      setWarrantyUrl(data.url);
      const ocrItem = Array.isArray(data.ocr) ? data.ocr[0] : data.ocr ?? null;
      setWarrantyOcrResult(ocrItem);
      if (ocrItem?.warrantyExpiry) { setField('warrantyExpiry', ocrItem.warrantyExpiry); setWarrantySrc('card-ocr'); }
      if (ocrItem?.serialNumber && !form.serialNumber) setField('serialNumber', ocrItem.serialNumber);
      if (ocrItem?.name && !form.name) setField('name', ocrItem.name);
      if (ocrItem?.brand && !form.brand) setField('brand', ocrItem.brand);
      setWarrantyStatus('done');
    } catch (err) {
      setWarrantyStatus('error');
      setError('Warranty card upload failed: ' + err.message);
    }
  };

  /* ── Save product — uses selectedVaultId ── */
  const handleSave = async () => {
    if (!form.name) return setError('Product name is required');
    setSaveLoading(true); setError('');
    try {
      let vaultId = selectedVaultId;
      if (!vaultId) {
        const existing = await api('/vaults/my');
        if (existing.length === 0) {
          await api('/vaults', 'POST', { name: 'My Vault' });
          const fresh = await api('/vaults/my');
          vaultId = fresh[0]._id;
          setVaults(fresh); setSelectedVaultId(vaultId);
        } else {
          vaultId = existing[0]._id;
          setVaults(existing); setSelectedVaultId(vaultId);
        }
      }
      await api('/products', 'POST', {
        name: form.name, brand: form.brand || undefined, category: form.category,
        purchaseDate: form.purchaseDate || undefined, purchasePrice: form.purchasePrice || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined, serialNumber: form.serialNumber || undefined,
        notes: form.notes || undefined, vaultId,
        billImageUrl:    billType === 'image' ? billUrl : undefined,
        billPdfUrl:      billType === 'pdf'   ? billUrl : undefined,
        warrantyCardUrl: warrantyUrl || undefined,
      });
      navigate('/products');
    } catch (err) {
      setError(err.message);
    } finally { setSaveLoading(false); }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM); setBillUrl(''); setBillType(''); setPreview('');
    setOcrStatus('idle'); setOcrItems([]); setSelectedIdx(null);
    setWarrantyUrl(''); setWarrantyPreview(''); setWarrantyStatus('idle');
    setWarrantySrc(''); setError(''); setWarrantyOcrResult(null);
  };

  const statusCard = {
    idle:      { border:'var(--cyan)',   bg:'var(--cyan-dim)',       icon:'🤖', color:'var(--cyan)',   title:'AI OCR Ready',               sub:'Extracts name, price, date, warranty automatically' },
    uploading: { border:'var(--gold)',   bg:'rgba(232,184,75,0.08)', icon:'⏳', color:'var(--gold)',   title:'Uploading & Running AI OCR…', sub:'Reading your bill with Groq Vision…' },
    done:      { border:'var(--cyan)',   bg:'var(--cyan-dim)',       icon:'✅', color:'var(--cyan)',   title:'OCR Complete — Form Auto-Filled', sub:'Review and correct any fields below' },
    error:     { border:'var(--danger)', bg:'rgba(245,75,75,0.08)', icon:'❌', color:'var(--danger)', title:'Upload failed — fill manually', sub:'Check file format and try again' },
  }[ocrStatus];

  const warrantyBadge = {
    idle:      { color:'var(--text-muted)', icon:'📋', text:'No warranty card uploaded yet' },
    uploading: { color:'var(--gold)',       icon:'⏳', text:'Uploading & scanning for expiry date…' },
    done:      { color:'var(--cyan)',       icon:'✅', text: warrantySrc === 'card-ocr' ? 'Warranty date auto-filled ↑' : 'Card saved (no date found — enter manually)' },
    error:     { color:'var(--danger)',     icon:'❌', text:'Upload failed — try again' },
  }[warrantyStatus];

  const warrantySrcChip = warrantySrc && (
    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', padding:'2px 8px', borderRadius:10, marginLeft:6,
      background: warrantySrc==='card-ocr'?'rgba(99,202,183,0.15)':warrantySrc==='bill-ocr'?'rgba(232,184,75,0.12)':'rgba(255,255,255,0.06)',
      color: warrantySrc==='card-ocr'?'var(--cyan)':warrantySrc==='bill-ocr'?'var(--gold)':'var(--text-muted)',
      border:`1px solid ${warrantySrc==='card-ocr'?'rgba(99,202,183,0.3)':warrantySrc==='bill-ocr'?'rgba(232,184,75,0.3)':'rgba(255,255,255,0.1)'}`,
    }}>
      {warrantySrc==='card-ocr'?'🛡️ CARD':warrantySrc==='bill-ocr'?'🧾 BILL':'✏️ MANUAL'}
    </span>
  );

  const selectedVaultName = vaults.find(v => v._id === selectedVaultId)?.name;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>AI-POWERED ENTRY</p>
            <h1>Scan Bill / Add Product</h1>
            <p>Upload a receipt — AI fills the form automatically via Groq Vision</p>
          </div>

          {/* ── Vault Selector ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
            <div className="input-label" style={{ fontSize:10, letterSpacing:'.06em' }}>SAVING TO VAULT</div>
            {vaultsLoading ? (
              <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 14px' }}>Loading vaults…</div>
            ) : vaults.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 14px',
                background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:10 }}>
                ⚠️ No vaults — one will be created on save
              </div>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'flex-end' }}>
                {vaults.map(v => (
                  <button key={v._id} onClick={() => setSelectedVaultId(v._id)} style={{
                    padding:'7px 16px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer',
                    border:`1.5px solid ${selectedVaultId === v._id ? 'var(--gold)' : 'var(--border)'}`,
                    background: selectedVaultId === v._id ? 'rgba(232,184,75,0.12)' : 'var(--surface)',
                    color: selectedVaultId === v._id ? 'var(--gold)' : 'var(--text-muted)',
                    transition:'all 0.18s',
                  }}>
                    {selectedVaultId === v._id ? '🔒 ' : ''}{v.name}
                  </button>
                ))}
              </div>
            )}
            {selectedVaultName && (
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                Product will be added to&nbsp;
                <span style={{ color:'var(--gold)', fontWeight:600 }}>{selectedVaultName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid-2">
          {/* ── LEFT: uploads ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display:'none' }} onChange={e => { handleFile(e.target.files[0]); e.target.value=''; }} />
            <input ref={warrantyRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display:'none' }} onChange={e => { handleWarrantyFile(e.target.files[0]); e.target.value=''; }} />

            <div className="scan-zone"
              style={{ position:'relative', height:260, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                cursor:ocrStatus==='uploading'?'wait':'pointer',
                border:dragOver?'2px dashed var(--gold)':undefined, transition:'border 0.2s' }}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={e=>{e.preventDefault();setDragOver(false);}}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}>
              <div className="scan-line" />
              {preview ? (
                <img src={preview} alt="Bill preview" style={{ maxHeight:210, maxWidth:'100%', borderRadius:8, objectFit:'contain' }} />
              ) : (
                <>
                  <span style={{ fontSize:48, marginBottom:12, display:'block' }}>
                    {ocrStatus==='uploading'?'⏳':dragOver?'📥':'🧾'}
                  </span>
                  <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, marginBottom:6 }}>
                    {ocrStatus==='uploading'?'Processing…':dragOver?'Drop it!':'Drop Receipt Here'}
                  </h3>
                  <p style={{ fontSize:13, color:'var(--text-muted)' }}>JPG, PNG, PDF · Max 10MB</p>
                </>
              )}
              {ocrStatus !== 'uploading' && (
                <button className="btn-primary" style={{ marginTop: preview ? 10 : 16 }} onClick={() => fileRef.current.click()}>
                  📂 {preview ? 'Replace File' : 'Browse Files'}
                </button>
              )}
            </div>

            <div className="card" style={{ borderColor:statusCard.border, background:statusCard.bg }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{statusCard.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:statusCard.color }}>{statusCard.title}</div>
                  {statusCard.sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{statusCard.sub}</div>}
                </div>
                {ocrStatus === 'done' && billUrl && (
                  <a href={billUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize:11, color:'var(--gold)', textDecoration:'underline', flexShrink:0 }}>View Bill ↗</a>
                )}
              </div>
            </div>

            {ocrStatus === 'done' && ocrItems.length > 1 && (
              <div className="card" style={{ borderColor:'var(--gold)', background:'rgba(232,184,75,0.06)' }}>
                <p className="label" style={{ marginBottom:10, color:'var(--gold)' }}>
                  🧾 {ocrItems.length} PRODUCTS FOUND — SELECT ONE TO ADD
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {ocrItems.map((item, idx) => (
                    <button key={idx} onClick={() => { setSelectedIdx(idx); applyOcrItem(item); }}
                      style={{ background: selectedIdx === idx ? 'rgba(232,184,75,0.15)' : 'var(--surface)',
                        border: `1.5px solid ${selectedIdx === idx ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius:10, padding:'10px 14px', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color: selectedIdx === idx ? 'var(--gold)' : 'var(--text)' }}>
                            {item.name || `Product ${idx + 1}`}
                          </div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                            {item.brand && `${item.brand} · `}{item.category}
                            {item.warrantyExpiry && ` · Warranty till ${item.warrantyExpiry}`}
                          </div>
                        </div>
                        {item.purchasePrice != null && (
                          <div style={{ fontSize:14, fontWeight:700, color:'var(--cyan)', flexShrink:0 }}>
                            ₹{Number(item.purchasePrice).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
                  Save each product separately — select one, save, then come back for the next.
                </p>
              </div>
            )}

            <div className="card" style={{ borderColor: warrantyDragOver ? 'var(--gold)' : warrantyStatus === 'done' ? 'var(--cyan)' : 'var(--border)', transition:'border-color 0.2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:18 }}>🛡️</span>
                <div>
                  <p className="label" style={{ marginBottom:0 }}>WARRANTY CARD</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Separate document — AI extracts expiry date, serial number &amp; model</p>
                </div>
                {warrantyStatus === 'done' && warrantyUrl && (
                  <a href={warrantyUrl} target="_blank" rel="noreferrer"
                    style={{ marginLeft:'auto', fontSize:11, color:'var(--gold)', textDecoration:'underline' }}>View ↗</a>
                )}
              </div>
              <div onDragOver={e=>{e.preventDefault();setWarrantyDragOver(true);}}
                onDragLeave={e=>{e.preventDefault();setWarrantyDragOver(false);}}
                onDrop={e=>{e.preventDefault();setWarrantyDragOver(false);handleWarrantyFile(e.dataTransfer.files[0]);}}
                style={{ border:`1.5px dashed ${warrantyDragOver?'var(--gold)':'var(--border)'}`,
                  borderRadius:10, padding:'14px 12px', display:'flex', alignItems:'center', gap:14,
                  background: warrantyDragOver ? 'rgba(232,184,75,0.06)' : 'var(--surface)',
                  transition:'all 0.2s', minHeight:72, cursor: warrantyStatus === 'uploading' ? 'wait' : 'default' }}>
                {warrantyPreview ? (
                  <img src={warrantyPreview} alt="Warranty" style={{ width:56, height:56, objectFit:'cover', borderRadius:6, flexShrink:0, border:'1px solid var(--border)' }} />
                ) : (
                  <div style={{ width:56, height:56, borderRadius:6, flexShrink:0, background:'rgba(255,255,255,0.04)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, border:'1px solid var(--border)' }}>
                    {warrantyStatus==='uploading'?'⏳':warrantyDragOver?'📥':'📋'}
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:warrantyBadge.color, marginBottom:2 }}>
                    {warrantyBadge.icon} {warrantyBadge.text}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {warrantyStatus==='idle' && 'Drag & drop or Browse · JPG, PNG, PDF'}
                    {warrantyStatus==='uploading' && 'AI scanning for expiry date & product info…'}
                    {warrantyStatus==='done' && form.warrantyExpiry && `✅ Expiry detected: ${form.warrantyExpiry}`}
                    {warrantyStatus==='done' && !form.warrantyExpiry && '⚠️ No expiry date detected — please enter manually'}
                    {warrantyStatus==='error' && 'Please try again with a clearer image'}
                  </div>
                  {warrantyStatus === 'done' && warrantyOcrResult && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                      {warrantyOcrResult.serialNumber && (
                        <span style={{ fontSize:10, background:'rgba(75,232,216,0.1)', color:'var(--cyan)', border:'1px solid rgba(75,232,216,0.2)', borderRadius:8, padding:'2px 7px' }}>
                          S/N: {warrantyOcrResult.serialNumber}
                        </span>
                      )}
                      {warrantyOcrResult.name && (
                        <span style={{ fontSize:10, background:'rgba(232,184,75,0.1)', color:'var(--gold)', border:'1px solid rgba(232,184,75,0.2)', borderRadius:8, padding:'2px 7px' }}>
                          {warrantyOcrResult.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {warrantyStatus !== 'uploading' && (
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button className="btn-ghost" style={{ fontSize:11, padding:'6px 12px' }} onClick={() => warrantyRef.current.click()}>
                      {warrantyStatus==='done' ? '🔄 Replace' : '📂 Browse'}
                    </button>
                    {warrantyStatus === 'done' && (
                      <button className="btn-ghost" style={{ fontSize:11, padding:'6px 10px', color:'var(--danger)' }}
                        onClick={() => { setWarrantyUrl(''); setWarrantyPreview(''); setWarrantyStatus('idle'); setWarrantySrc(''); setWarrantyOcrResult(null); }}>✕</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: form ── */}
          <div className="card-glint">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <p className="label">PRODUCT DETAILS FORM</p>
              {selectedVaultName && (
                <span style={{ fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8,
                  background:'rgba(232,184,75,0.1)', color:'var(--gold)', border:'1px solid rgba(232,184,75,0.25)' }}>
                  🔒 {selectedVaultName}
                </span>
              )}
            </div>

            {error && (
              <div style={{ background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)', marginBottom:16 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <div className="input-label">PRODUCT NAME *</div>
              <input className="input-field" placeholder='e.g. Samsung TV 55"' value={form.name} onChange={e=>setField('name',e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <div className="input-label">BRAND</div>
                <input className="input-field" placeholder="e.g. Samsung" value={form.brand} onChange={e=>setField('brand',e.target.value)} />
              </div>
              <div className="form-group">
                <div className="input-label">CATEGORY *</div>
                <select className="input-field" value={form.category} onChange={e=>setField('category',e.target.value)}>
                  <option>Electronics</option><option>Appliance</option>
                  <option>Vehicle</option><option>Furniture</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <div className="input-label">PURCHASE DATE</div>
                <input className="input-field" type="date" value={form.purchaseDate} onChange={e=>setField('purchaseDate',e.target.value)} />
              </div>
              <div className="form-group">
                <div className="input-label">PURCHASE PRICE (₹)</div>
                <input className="input-field" type="number" placeholder="e.g. 45000" value={form.purchasePrice} onChange={e=>setField('purchasePrice',e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <div className="input-label" style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:4 }}>
                  WARRANTY EXPIRY {warrantySrcChip}
                </div>
                <input className="input-field" type="date" value={form.warrantyExpiry}
                  onChange={e => { setField('warrantyExpiry', e.target.value); setWarrantySrc('manual'); }}
                  style={{ borderColor: form.warrantyExpiry
                    ? (warrantySrc==='card-ocr' ? 'var(--cyan)' : warrantySrc==='bill-ocr' ? 'var(--gold)' : 'var(--border)')
                    : 'var(--border)', transition:'border-color 0.3s' }} />
                {form.warrantyExpiry && warrantySrc && (
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
                    {warrantySrc==='card-ocr' && '🛡️ Auto-filled from warranty card'}
                    {warrantySrc==='bill-ocr' && '🧾 Auto-filled from bill scan'}
                    {warrantySrc==='manual'   && '✏️ Entered manually'}
                  </div>
                )}
              </div>
              <div className="form-group">
                <div className="input-label">SERIAL NUMBER</div>
                <input className="input-field" placeholder="Optional" value={form.serialNumber} onChange={e=>setField('serialNumber',e.target.value)} />
              </div>
            </div>

            {warrantyStatus === 'done' && warrantyPreview && (
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(99,202,183,0.06)', border:'1px solid rgba(99,202,183,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                <img src={warrantyPreview} alt="warranty" style={{ width:40, height:40, objectFit:'cover', borderRadius:4, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--cyan)' }}>🛡️ Warranty card attached</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    Saved · {warrantyUrl && <a href={warrantyUrl} target="_blank" rel="noreferrer" style={{ color:'var(--gold)' }}>View ↗</a>}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <div className="input-label">NOTES</div>
              <textarea className="input-field" style={{ height:60, resize:'none' }}
                placeholder="Any additional notes…" value={form.notes} onChange={e=>setField('notes',e.target.value)} />
            </div>
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button className="btn-primary" style={{ flex:1, justifyContent:'center' }}
                onClick={handleSave}
                disabled={saveLoading || ocrStatus==='uploading' || warrantyStatus==='uploading'}>
                {saveLoading ? 'Saving…' : '💾 Save Product'}
              </button>
              <button className="btn-ghost" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Scan;
