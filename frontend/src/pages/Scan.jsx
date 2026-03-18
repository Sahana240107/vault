import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { api, uploadBill } from '../services/api';

const EMPTY_FORM = {
  name: '', brand: '', category: 'Electronics',
  purchaseDate: '', purchasePrice: '', warrantyExpiry: '',
  serialNumber: '', notes: '',
};

const NOTIFY_DEFAULTS = { emailAddr: '', daysBefore: 30 };

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

  const [warrantyPreview, setWarrantyPreview] = useState('');
  const [warrantyUrl,     setWarrantyUrl]     = useState('');
  const [warrantyStatus,  setWarrantyStatus]  = useState('idle');
  const [warrantySrc,     setWarrantySrc]     = useState('');

  const [notify,       setNotify]       = useState(NOTIFY_DEFAULTS);
  const [prefsSaved,   setPrefsSaved]   = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setN     = (k, v) => setNotify(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api('/notifications/prefs').then(prefs => {
      if (prefs) {
        setNotify({
          emailAddr:  prefs.emailAddr || '',
          daysBefore: Array.isArray(prefs.daysBefore)
            ? prefs.daysBefore[0] ?? 30
            : prefs.daysBefore ?? 30,
        });
      }
    }).catch(() => {});
  }, []);

  // ── bill upload ─────────────────────────────────────────────────────────────
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
      if (data.ocr) {
        setForm(prev => ({
          ...prev,
          name:          data.ocr.name           || prev.name,
          brand:         data.ocr.brand          || prev.brand,
          category:      data.ocr.category       || prev.category,
          purchaseDate:  data.ocr.purchaseDate   || prev.purchaseDate,
          purchasePrice: data.ocr.purchasePrice != null
            ? String(data.ocr.purchasePrice) : prev.purchasePrice,
          warrantyExpiry: data.ocr.warrantyExpiry || prev.warrantyExpiry,
          serialNumber:  data.ocr.serialNumber   || prev.serialNumber,
        }));
        if (data.ocr.warrantyExpiry) setWarrantySrc('bill-ocr');
      }
      setOcrStatus('done');
    } catch (err) {
      setOcrStatus('error'); setError('Upload failed: ' + err.message);
    }
  };

  // ── warranty card upload ────────────────────────────────────────────────────
  const handleWarrantyFile = async (file) => {
    if (!file) return;
    setWarrantyStatus('uploading');
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = e => setWarrantyPreview(e.target.result);
      r.readAsDataURL(file);
    } else setWarrantyPreview('');

    try {
      const data = await uploadBill(file);
      setWarrantyUrl(data.url);
      if (data.ocr?.warrantyExpiry) {
        setField('warrantyExpiry', data.ocr.warrantyExpiry);
        setWarrantySrc('card-ocr');
      }
      setWarrantyStatus('done');
    } catch (err) {
      setWarrantyStatus('error');
      setError('Warranty card upload failed: ' + err.message);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };
  const onWarrantyDrop = (e) => {
    e.preventDefault(); setWarrantyDragOver(false);
    handleWarrantyFile(e.dataTransfer.files[0]);
  };

  const saveNotifyPrefs = async () => {
    setPrefsLoading(true);
    try {
      await api('/notifications/prefs', 'PUT', {
        emailAddr:  notify.emailAddr,
        daysBefore: [Number(notify.daysBefore)],
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (err) {
      setError('Could not save notification prefs: ' + err.message);
    } finally {
      setPrefsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) return setError('Product name is required');
    if (!notify.emailAddr) return setError('Enter an email address for warranty alerts');

    setSaveLoading(true); setError('');
    try {
      await api('/notifications/prefs', 'PUT', {
        emailAddr:  notify.emailAddr,
        daysBefore: [Number(notify.daysBefore)],
      });

      const vaults = await api('/vaults/my');
      let vaultId;
      if (vaults.length === 0) {
        await api('/vaults', 'POST', { name: 'My Vault' });
        vaultId = (await api('/vaults/my'))[0]._id;
      } else {
        vaultId = vaults[0]._id;
      }

      await api('/products', 'POST', {
        name:           form.name,
        brand:          form.brand          || undefined,
        category:       form.category,
        purchaseDate:   form.purchaseDate   || undefined,
        purchasePrice:  form.purchasePrice  || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        serialNumber:   form.serialNumber   || undefined,
        notes:          form.notes          || undefined,
        vaultId,
        billImageUrl:    billType === 'image' ? billUrl : undefined,
        billPdfUrl:      billType === 'pdf'   ? billUrl : undefined,
        warrantyCardUrl: warrantyUrl          || undefined,
      });

      navigate('/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setBillUrl(''); setBillType(''); setPreview(''); setOcrStatus('idle');
    setWarrantyUrl(''); setWarrantyPreview(''); setWarrantyStatus('idle');
    setWarrantySrc(''); setError('');
  };

  // ── status configs ──────────────────────────────────────────────────────────
  const statusCard = {
    idle:      { border:'var(--cyan)',   bg:'var(--cyan-dim)',       icon:'🤖', color:'var(--cyan)',   title:'AI OCR Ready',                sub:'Tesseract.js · Extracts name, price, date, warranty', badge:<span className="annot" style={{marginLeft:'auto'}}>LIVE</span> },
    uploading: { border:'var(--gold)',   bg:'rgba(232,184,75,0.08)', icon:'⏳', color:'var(--gold)',   title:'Uploading & Running OCR…',    sub:'Tesseract.js is reading your bill', badge:null },
    done:      { border:'var(--cyan)',   bg:'var(--cyan-dim)',       icon:'✅', color:'var(--cyan)',   title:'OCR Complete — Form Auto-Filled', sub:'Review and correct any fields below',
      badge: billUrl ? <a href={billUrl} target="_blank" rel="noreferrer" style={{marginLeft:'auto',fontSize:11,color:'var(--gold)',textDecoration:'underline'}}>View Bill ↗</a> : null },
    error:     { border:'var(--danger)', bg:'rgba(245,75,75,0.08)',  icon:'❌', color:'var(--danger)', title:'Upload failed — fill form manually', sub:'', badge:null },
  }[ocrStatus];

  const warrantyBadge = {
    idle:      { color:'var(--text-muted)', icon:'📋', text:'No warranty card uploaded yet' },
    uploading: { color:'var(--gold)',       icon:'⏳', text:'Uploading & scanning…' },
    done:      { color:'var(--cyan)',       icon:'✅', text: warrantySrc === 'card-ocr' ? 'Warranty date auto-filled from card ↑' : 'Warranty card saved' },
    error:     { color:'var(--danger)',     icon:'❌', text:'Upload failed' },
  }[warrantyStatus];

  const warrantySrcChip = warrantySrc && (
    <span style={{
      fontSize:10, fontWeight:700, letterSpacing:'0.06em', padding:'2px 8px',
      borderRadius:10, marginLeft:6,
      background: warrantySrc==='card-ocr' ? 'rgba(99,202,183,0.15)' : warrantySrc==='bill-ocr' ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.06)',
      color:       warrantySrc==='card-ocr' ? 'var(--cyan)'           : warrantySrc==='bill-ocr' ? 'var(--gold)'           : 'var(--text-muted)',
      border:`1px solid ${warrantySrc==='card-ocr' ? 'rgba(99,202,183,0.3)' : warrantySrc==='bill-ocr' ? 'rgba(232,184,75,0.3)' : 'rgba(255,255,255,0.1)'}`,
    }}>
      {warrantySrc==='card-ocr' ? '🛡️ FROM WARRANTY CARD' : warrantySrc==='bill-ocr' ? '🧾 FROM BILL' : '✏️ MANUAL'}
    </span>
  );

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

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display:'none' }} onChange={e => { handleFile(e.target.files[0]); e.target.value=''; }} />
            <input ref={warrantyRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display:'none' }} onChange={e => { handleWarrantyFile(e.target.files[0]); e.target.value=''; }} />

            {/* Bill drop zone */}
            <div
              className="scan-zone"
              style={{
                position:'relative', height:260,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                cursor: ocrStatus==='uploading' ? 'wait' : 'pointer',
                border: dragOver ? '2px dashed var(--gold)' : undefined,
                transition:'border 0.2s',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
              onDrop={onDrop}
            >
              <div className="scan-line" />
              {preview ? (
                <img src={preview} alt="Bill preview"
                  style={{ maxHeight:210, maxWidth:'100%', borderRadius:8, objectFit:'contain' }} />
              ) : (
                <>
                  <span style={{ fontSize:48, marginBottom:12, display:'block' }}>
                    {ocrStatus==='uploading' ? '⏳' : dragOver ? '📥' : '🧾'}
                  </span>
                  <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, marginBottom:6 }}>
                    {ocrStatus==='uploading' ? 'Processing…' : dragOver ? 'Drop it!' : 'Drop Receipt Here'}
                  </h3>
                  <p style={{ fontSize:13, color:'var(--text-muted)' }}>Supports JPG, PNG, PDF · Max 10MB</p>
                </>
              )}
              {ocrStatus !== 'uploading' && (
                <button className="btn-primary" style={{ marginTop: preview ? 10 : 16 }}
                  onClick={() => fileRef.current.click()}>
                  📂 {preview ? 'Replace File' : 'Browse Files'}
                </button>
              )}
            </div>

            {/* Bill OCR status */}
            <div className="card" style={{ borderColor:statusCard.border, background:statusCard.bg }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{statusCard.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:statusCard.color }}>{statusCard.title}</div>
                  {statusCard.sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{statusCard.sub}</div>}
                </div>
                {statusCard.badge}
              </div>
            </div>

            {/* Warranty Card Upload */}
            <div className="card" style={{
              borderColor: warrantyDragOver ? 'var(--gold)' : warrantyStatus==='done' ? 'var(--cyan)' : 'var(--border)',
              transition:'border-color 0.2s',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:18 }}>🛡️</span>
                <div>
                  <p className="label" style={{ marginBottom:0, letterSpacing:'0.08em' }}>WARRANTY CARD</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                    Upload separately if warranty is on a different document — OCR extracts expiry date
                  </p>
                </div>
                {warrantyStatus==='done' && warrantyUrl && (
                  <a href={warrantyUrl} target="_blank" rel="noreferrer"
                    style={{ marginLeft:'auto', fontSize:11, color:'var(--gold)', textDecoration:'underline', whiteSpace:'nowrap' }}>
                    View ↗
                  </a>
                )}
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setWarrantyDragOver(true); }}
                onDragLeave={e => { e.preventDefault(); setWarrantyDragOver(false); }}
                onDrop={onWarrantyDrop}
                style={{
                  border:`1.5px dashed ${warrantyDragOver ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius:10, padding:'14px 12px',
                  display:'flex', alignItems:'center', gap:14,
                  background: warrantyDragOver ? 'rgba(232,184,75,0.06)' : 'var(--surface)',
                  transition:'all 0.2s', minHeight:72,
                  cursor: warrantyStatus==='uploading' ? 'wait' : 'default',
                }}
              >
                {warrantyPreview ? (
                  <img src={warrantyPreview} alt="Warranty card"
                    style={{ width:56, height:56, objectFit:'cover', borderRadius:6,
                      flexShrink:0, border:'1px solid var(--border)' }} />
                ) : (
                  <div style={{ width:56, height:56, borderRadius:6, flexShrink:0,
                    background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:24, border:'1px solid var(--border)' }}>
                    {warrantyStatus==='uploading' ? '⏳' : warrantyDragOver ? '📥' : '📋'}
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:warrantyBadge.color, marginBottom:2 }}>
                    {warrantyBadge.icon} {warrantyBadge.text}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {warrantyStatus==='idle'      && 'Drag & drop or click Browse · JPG, PNG, PDF'}
                    {warrantyStatus==='uploading' && 'Running OCR on warranty card…'}
                    {warrantyStatus==='done'      && form.warrantyExpiry && `Expiry: ${form.warrantyExpiry}`}
                    {warrantyStatus==='error'     && 'Please try again'}
                  </div>
                </div>
                {warrantyStatus !== 'uploading' && (
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button className="btn-ghost" style={{ fontSize:11, padding:'6px 12px' }}
                      onClick={() => warrantyRef.current.click()}>
                      {warrantyStatus==='done' ? '🔄 Replace' : '📂 Browse'}
                    </button>
                    {warrantyStatus==='done' && (
                      <button className="btn-ghost"
                        style={{ fontSize:11, padding:'6px 10px', color:'var(--danger)' }}
                        onClick={() => { setWarrantyUrl(''); setWarrantyPreview(''); setWarrantyStatus('idle'); setWarrantySrc(''); }}
                      >✕</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Email Notification Preferences ── */}
            <div className="card" style={{ borderColor:'rgba(232,184,75,0.3)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <span style={{ fontSize:18 }}>📧</span>
                <div>
                  <p className="label" style={{ marginBottom:0 }}>WARRANTY EMAIL ALERTS</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                    Get an email before your warranty expires
                  </p>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom:10 }}>
                <div className="input-label">ALERT EMAIL ADDRESS</div>
                <input className="input-field" type="email" placeholder="you@example.com"
                  value={notify.emailAddr}
                  onChange={e => setN('emailAddr', e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom:14 }}>
                <div className="input-label">ALERT ME</div>
                <select className="input-field" value={notify.daysBefore}
                  onChange={e => setN('daysBefore', Number(e.target.value))}>
                  <option value={3}>3 days before expiry</option>
                  <option value={7}>7 days before expiry</option>
                  <option value={14}>14 days before expiry</option>
                  <option value={30}>30 days before expiry</option>
                  <option value={60}>60 days before expiry</option>
                  <option value={90}>90 days before expiry</option>
                </select>
              </div>

              <button className="btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:12 }}
                onClick={saveNotifyPrefs} disabled={prefsLoading}>
                {prefsLoading ? 'Saving…' : prefsSaved ? '✅ Preferences Saved!' : '💾 Save Alert Preferences'}
              </button>
            </div>

          </div>{/* end LEFT */}

          {/* ── RIGHT COLUMN: PRODUCT DETAILS FORM ──────────────────────── */}
          <div className="card-glint">
            <p className="label" style={{ marginBottom:16 }}>PRODUCT DETAILS FORM</p>

            {error && (
              <div style={{
                background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)',
                borderRadius:8, padding:'10px 14px', fontSize:13,
                color:'var(--danger)', marginBottom:16,
              }}>{error}</div>
            )}

            <div className="form-group">
              <div className="input-label">PRODUCT NAME *</div>
              <input className="input-field" placeholder='e.g. Samsung TV 55"'
                value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <div className="input-label">BRAND</div>
                <input className="input-field" placeholder="e.g. Samsung"
                  value={form.brand} onChange={e => setField('brand', e.target.value)} />
              </div>
              <div className="form-group">
                <div className="input-label">CATEGORY *</div>
                <select className="input-field" value={form.category}
                  onChange={e => setField('category', e.target.value)}>
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
                <input className="input-field" type="date" value={form.purchaseDate}
                  onChange={e => setField('purchaseDate', e.target.value)} />
              </div>
              <div className="form-group">
                <div className="input-label">PURCHASE PRICE (₹)</div>
                <input className="input-field" type="number" placeholder="e.g. 45000"
                  value={form.purchasePrice} onChange={e => setField('purchasePrice', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <div className="input-label" style={{ display:'flex', alignItems:'center' }}>
                  WARRANTY EXPIRY {warrantySrcChip}
                </div>
                <input className="input-field" type="date" value={form.warrantyExpiry}
                  onChange={e => { setField('warrantyExpiry', e.target.value); setWarrantySrc('manual'); }}
                  style={{
                    borderColor: form.warrantyExpiry
                      ? (warrantySrc==='card-ocr' ? 'var(--cyan)' : warrantySrc==='bill-ocr' ? 'var(--gold)' : 'var(--border)')
                      : 'var(--border)',
                    boxShadow: form.warrantyExpiry
                      ? (warrantySrc==='card-ocr' ? '0 0 0 1px rgba(99,202,183,0.2)' : warrantySrc==='bill-ocr' ? '0 0 0 1px rgba(232,184,75,0.2)' : 'none')
                      : 'none',
                    transition:'border-color 0.3s, box-shadow 0.3s',
                  }}
                />
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
                <input className="input-field" placeholder="Optional" value={form.serialNumber}
                  onChange={e => setField('serialNumber', e.target.value)} />
              </div>
            </div>

            {/* Warranty card attached confirmation */}
            {warrantyStatus==='done' && warrantyPreview && (
              <div style={{
                display:'flex', alignItems:'center', gap:10,
                background:'rgba(99,202,183,0.06)', border:'1px solid rgba(99,202,183,0.2)',
                borderRadius:8, padding:'10px 14px', marginBottom:12,
              }}>
                <img src={warrantyPreview} alt="warranty"
                  style={{ width:40, height:40, objectFit:'cover', borderRadius:4, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--cyan)' }}>🛡️ Warranty card attached</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    Saved as warrantyCardUrl in DB
                    {warrantyUrl && <> · <a href={warrantyUrl} target="_blank" rel="noreferrer"
                      style={{ color:'var(--gold)' }}>View ↗</a></>}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <div className="input-label">NOTES</div>
              <textarea className="input-field" style={{ height:60, resize:'none' }}
                placeholder="Any additional notes…" value={form.notes}
                onChange={e => setField('notes', e.target.value)} />
            </div>

            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button className="btn-primary"
                style={{ flex:1, justifyContent:'center' }}
                onClick={handleSave}
                disabled={saveLoading || ocrStatus==='uploading' || warrantyStatus==='uploading'}
              >
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