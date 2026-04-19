import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const getInitials = (name) =>
  (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const getCurrentJti = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).jti ?? null;
  } catch { return null; }
};

const Toast = ({ msg, type }) => {
  if (!msg) return null;
  const c = {
    success: { bg:'rgba(75,245,154,0.08)',  border:'rgba(75,245,154,0.3)',  color:'var(--success)' },
    error:   { bg:'rgba(245,75,75,0.08)',   border:'rgba(245,75,75,0.3)',   color:'var(--danger)'  },
    info:    { bg:'rgba(75,232,216,0.08)',  border:'rgba(75,232,216,0.3)',  color:'var(--cyan)'    },
  }[type] || {};
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.color,
      borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16, animation:'fadeIn .22s ease' }}>
      {msg}
    </div>
  );
};

const Toggle = ({ on, onFlip, label, sub, icon }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ fontSize:18, width:24, textAlign:'center' }}>{icon}</span>
      <div>
        <div style={{ fontSize:13, fontWeight:500 }}>{label}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>
      </div>
    </div>
    <button role="switch" aria-checked={on} onClick={onFlip} style={{
      flexShrink:0, width:52, height:28, borderRadius:14, border:'none', cursor:'pointer',
      padding:0, position:'relative',
      background: on ? 'linear-gradient(135deg,#e8b84b,#f5c96a)' : 'rgba(255,255,255,0.06)',
      boxShadow: on ? '0 0 14px rgba(232,184,75,0.45),inset 0 1px 0 rgba(255,255,255,0.15)' : 'inset 0 0 0 1px rgba(255,255,255,0.1)',
      transition:'background .28s,box-shadow .28s', outline:'none',
    }}>
      <span style={{ position:'absolute', left:on?8:'auto', right:on?'auto':8, top:'50%',
        transform:'translateY(-50%)', fontSize:9, fontWeight:700, letterSpacing:'.04em',
        color:on?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.25)', transition:'opacity .2s',
        userSelect:'none', pointerEvents:'none' }}>{on?'ON':'OFF'}</span>
      <span style={{ position:'absolute', top:3, left:on?'calc(100% - 25px)':3,
        width:22, height:22, borderRadius:'50%',
        background:on?'#fff':'rgba(255,255,255,0.18)',
        boxShadow:on?'0 2px 6px rgba(0,0,0,0.3)':'none',
        transition:'left .28s cubic-bezier(.34,1.56,.64,1),background .28s',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, color:on?'#e8a800':'rgba(255,255,255,0.35)', pointerEvents:'none' }}>
        {on?'✓':'✕'}
      </span>
    </button>
  </div>
);

const NOTIF_DEFAULTS = [
  { key:'warrantyAlerts', label:'Warranty Expiry Alerts',   sub:'30 days before expiry',              icon:'⚠️', on:true  },
  { key:'geoAlerts',      label:'Geo-Aware Service Alerts', sub:"When you're near a service center",  icon:'📍', on:true  },
  { key:'vaultActivity',  label:'Family Vault Activity',    sub:'Members adding or editing products', icon:'👨‍👩‍👧', on:true  },
  { key:'scanSummaries',  label:'AI Scan Summaries',        sub:'After each bill scan completes',     icon:'🤖', on:false },
  { key:'weeklyDigest',   label:'Weekly Vault Digest',      sub:'Email summary every Monday',         icon:'📧', on:true  },
];

const exportAsDocx = async (payload) => {
  if (!window.JSZip) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const { user, vaults, products, notifications, exportedAt } = payload;
  const esc = (s) => String(s||'—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const para = (text,bold=false,size=22,color='000000') => `<w:p><w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${size}"/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  const heading = (text,level=1) => { const size=level===1?36:28; const color=level===1?'E8B84B':'333333'; return `<w:p><w:pPr><w:spacing w:before="${level===1?300:200}" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="${size}"/><w:color w:val="${color}"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`; };
  const tableRow = (cells,isHeader=false) => { const cols=cells.map(c=>`<w:tc><w:tcPr><w:shading w:val="clear" w:color="auto" w:fill="${isHeader?'1A1A2E':'F5F5F5'}"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr>${isHeader?'<w:b/>':''}<w:sz w:val="18"/><w:color w:val="${isHeader?'E8B84B':'333333'}"/></w:rPr><w:t xml:space="preserve">${esc(c)}</w:t></w:r></w:p></w:tc>`).join(''); return `<w:tr>${cols}</w:tr>`; };
  const table = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/></w:tblBorders></w:tblPr>${rows.join('')}</w:tbl>`;
  const blank = `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
  const productRows=[tableRow(['Name','Brand','Category','Warranty Expiry','Price'],true),...(products.length===0?[tableRow(['No products found','','','',''])]:products.map(p=>tableRow([p.name||'—',p.brand||'—',p.category||'—',p.warrantyExpiry?new Date(p.warrantyExpiry).toLocaleDateString('en-IN'):'—',p.purchasePrice?`Rs.${p.purchasePrice.toLocaleString()}`:'—'])))];
  const notifRows=[tableRow(['Type','Message','Date'],true),...(notifications.length===0?[tableRow(['No notifications','',''])]:notifications.map(n=>tableRow([(n.type||'—').replace(/_/g,' '),n.message||'—',n.createdAt?new Date(n.createdAt).toLocaleDateString('en-IN'):'—'])))];
  const bodyContent=[heading('VaultMERN — Data Export'),para(`Exported: ${new Date(exportedAt).toLocaleString('en-IN')}`,false,18,'888888'),para(`User: ${user.name} (${user.email})`,false,18,'888888'),blank,heading('Vaults',2),...(vaults.length===0?[para('No vaults found.')]:vaults.map(v=>para(`• ${v.name}`))),blank,heading(`Products (${products.length})`,2),table(productRows),blank,heading(`Notification History (${notifications.length})`,2),table(notifRows)].join('\n');
  const documentXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" mc:Ignorable=""><w:body>${bodyContent}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const zip=new window.JSZip();
  zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/document.xml',documentXml);
  zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
  return await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
};

const Profile = () => {
  const { user, updateUser } = useAuth();

  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [profileMsg,  setProfileMsg]  = useState({ msg:'', type:'' });
  const [profileBusy, setProfileBusy] = useState(false);

  const [pwOpen,  setPwOpen]  = useState(false);
  const [curPw,   setCurPw]   = useState('');
  const [newPw,   setNewPw]   = useState('');
  const [conPw,   setConPw]   = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwMsg,   setPwMsg]   = useState({ msg:'', type:'' });
  const [pwBusy,  setPwBusy]  = useState(false);

  const [toggles,     setToggles]     = useState(NOTIF_DEFAULTS);
  const [togglesBusy, setTogglesBusy] = useState(false);
  const [togglesMsg,  setTogglesMsg]  = useState({ msg:'', type:'' });

  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions,     setSessions]     = useState([]);
  const [sessionsLoad, setSessionsLoad] = useState(false);
  const [sessionsMsg,  setSessionsMsg]  = useState({ msg:'', type:'' });
  const currentJti = getCurrentJti();

  const [exporting,     setExporting]     = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportMsg,     setExportMsg]     = useState({ msg:'', type:'' });

  useEffect(() => {
    if (!user) return;
    setName(user.name  || '');
    setEmail(user.email || '');
    api('/notifications/prefs').then(prefs => {
      if (prefs?.toggles) setToggles(prev => prev.map(t => ({ ...t, on:prefs.toggles[t.key]??t.on })));
    }).catch(() => {});
  }, [user]);

  const loadSessions = useCallback(async () => {
    setSessionsLoad(true);
    try { setSessions(await api('/auth/sessions')); }
    catch { setSessionsMsg({ msg:'Could not load sessions.', type:'error' }); }
    finally { setSessionsLoad(false); }
  }, []);

  useEffect(() => { if (sessionsOpen) loadSessions(); }, [sessionsOpen, loadSessions]);

  const saveProfile = async () => {
    if (!name.trim())  return setProfileMsg({ msg:'Name cannot be empty.', type:'error' });
    if (!email.trim()) return setProfileMsg({ msg:'Email cannot be empty.', type:'error' });
    setProfileBusy(true); setProfileMsg({ msg:'', type:'' });
    try {
      const updated = await api('/auth/me', 'PUT', { name:name.trim(), email:email.trim() });
      updateUser({ name:updated.name, email:updated.email });
      setProfileMsg({ msg:'✅ Profile saved!', type:'success' });
    } catch (err) {
      setProfileMsg({ msg:err.message||'Save failed.', type:'error' });
    } finally {
      setProfileBusy(false);
      setTimeout(() => setProfileMsg({ msg:'', type:'' }), 4000);
    }
  };

  const changePassword = async () => {
    if (!curPw) return setPwMsg({ msg:'Enter your current password.', type:'error' });
    if (newPw.length < 6) return setPwMsg({ msg:'New password must be 6+ characters.', type:'error' });
    if (newPw !== conPw)  return setPwMsg({ msg:"Passwords don't match.", type:'error' });
    setPwBusy(true); setPwMsg({ msg:'', type:'' });
    try {
      await api('/auth/change-password', 'PUT', { currentPassword:curPw, newPassword:newPw });
      setPwMsg({ msg:'✅ Password changed!', type:'success' });
      setCurPw(''); setNewPw(''); setConPw('');
      setTimeout(() => { setPwMsg({ msg:'', type:'' }); setPwOpen(false); }, 2500);
    } catch (err) {
      setPwMsg({ msg:err.message||'Failed.', type:'error' });
    } finally { setPwBusy(false); }
  };

  const pwStrength = (() => {
    if (!newPw) return null;
    if (newPw.length < 6)  return { label:'Too short', pct:15, steps:1, color:'var(--danger)',  hint:'need 6+ chars' };
    if (newPw.length < 8)  return { label:'Weak',      pct:35, steps:1, color:'var(--warn)',    hint:'add uppercase' };
    if (!/[A-Z]/.test(newPw)||!/\d/.test(newPw)) return { label:'Fair', pct:60, steps:2, color:'var(--warn)', hint:'add a number' };
    if (newPw.length >= 12) return { label:'Strong',   pct:100,steps:4, color:'var(--success)', hint:'excellent!' };
    return                         { label:'Good',     pct:80, steps:3, color:'var(--cyan)',    hint:'add more characters' };
  })();

  const saveToggles = async () => {
    setTogglesBusy(true);
    try {
      const map = Object.fromEntries(toggles.map(t => [t.key, t.on]));
      await api('/notifications/prefs', 'PUT', { toggles:map });
      setTogglesMsg({ msg:'✅ Preferences saved!', type:'success' });
    } catch {
      setTogglesMsg({ msg:'⚡ Saved locally (sync pending).', type:'info' });
    } finally {
      setTogglesBusy(false);
      setTimeout(() => setTogglesMsg({ msg:'', type:'' }), 3500);
    }
  };

  const revokeSession = async (jti) => {
    try {
      await api(`/auth/sessions/${jti}`, 'DELETE');
      setSessions(prev => prev.filter(s => s.jti !== jti));
      setSessionsMsg({ msg:'✅ Session revoked.', type:'success' });
    } catch { setSessionsMsg({ msg:'Failed to revoke.', type:'error' }); }
    setTimeout(() => setSessionsMsg({ msg:'', type:'' }), 3000);
  };

  const revokeAll = async () => {
    if (!window.confirm('Sign out of all other sessions?')) return;
    try {
      await api('/auth/sessions', 'DELETE');
      setSessions([]);
      setSessionsMsg({ msg:'✅ All sessions cleared.', type:'success' });
    } catch { setSessionsMsg({ msg:'Failed.', type:'error' }); }
    setTimeout(() => setSessionsMsg({ msg:'', type:'' }), 3000);
  };

  const gatherExportData = async () => {
    const vaults = await api('/vaults/my').catch(() => []);
    const allProducts = (await Promise.all(vaults.map(v => api(`/products?vaultId=${v._id}`).catch(() => [])))).flat();
    const notifications = await api('/notifications').catch(() => []);
    return {
      exportedAt: new Date().toISOString(),
      user: { name: user?.name, email: user?.email },
      vaults: vaults.map(v => ({ id:v._id, name:v.name })),
      products: allProducts,
      notifications,
    };
  };

  const handleExportJson = async () => {
    setExporting(true); setExportMsg({ msg:'', type:'' });
    try {
      const payload = await gatherExportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
      const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`vault-export-${Date.now()}.json` });
      a.click(); URL.revokeObjectURL(a.href);
      setExportMsg({ msg:`✅ JSON exported — ${payload.products.length} products, ${payload.notifications.length} notifications.`, type:'success' });
    } catch (err) {
      setExportMsg({ msg:'❌ Export failed: ' + err.message, type:'error' });
    } finally { setExporting(false); setTimeout(() => setExportMsg({ msg:'', type:'' }), 5000); }
  };

  const handleExportDocx = async () => {
    setExportingDocx(true); setExportMsg({ msg:'⏳ Building Word document…', type:'info' });
    try {
      const payload = await gatherExportData();
      const blob = await exportAsDocx(payload);
      const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`vault-export-${Date.now()}.docx` });
      a.click(); URL.revokeObjectURL(a.href);
      setExportMsg({ msg:`✅ Word document exported — ${payload.products.length} products, ${payload.notifications.length} notifications.`, type:'success' });
    } catch (err) {
      setExportMsg({ msg:'❌ DOCX export failed: ' + err.message, type:'error' });
    } finally { setExportingDocx(false); setTimeout(() => setExportMsg({ msg:'', type:'' }), 5000); }
  };

  const timeAgo = (date) => {
    if (!date) return 'Unknown';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  };

  const av = getInitials(user?.name);

  return (
    <div className="app-shell">
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
        @keyframes expandIn{from{opacity:0;transform:scaleY(.96)}to{opacity:1;transform:scaleY(1)}}

        .collapse{overflow:hidden;max-height:0;opacity:0;transition:max-height .38s cubic-bezier(.4,0,.2,1),opacity .28s ease}
        .collapse.open{max-height:720px;opacity:1}

        .pw-wrap{position:relative}
        .pw-wrap .input-field{padding-right:40px}
        .eye{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;
          cursor:pointer;font-size:15px;color:var(--text-muted);padding:2px}
        .eye:hover{color:var(--text-primary)}

        /* 4-segment strength bar */
        .str-steps{display:flex;gap:4px;margin-top:8px}
        .str-step{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,0.07);transition:background .3s}

        /* Security feature rows */
        .sec-feature-row{
          display:flex;align-items:center;gap:12px;
          padding:13px 16px;border-radius:11px;
          background:rgba(255,255,255,0.02);
          border:1px solid rgba(255,255,255,0.06);
          transition:border-color .2s,background .2s;
        }
        .sec-feature-row:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.09)}
        .sec-icon-box{
          width:36px;height:36px;border-radius:10px;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;font-size:15px;
        }

        /* Expand panels */
        .sec-panel{
          border-radius:12px;padding:16px;margin-top:2px;
          animation:expandIn .22s ease;transform-origin:top;
        }
        .pw-panel{background:rgba(232,184,75,0.04);border:1px solid rgba(232,184,75,0.15)}
        .sess-panel{background:rgba(75,232,216,0.03);border:1px solid rgba(75,232,216,0.12)}

        /* Session cards */
        .session-card{
          display:flex;align-items:flex-start;gap:12px;
          padding:13px 15px;border-radius:11px;
          background:rgba(255,255,255,0.025);border:1px solid var(--border);
          transition:border-color .2s,transform .15s;
        }
        .session-card:hover{border-color:rgba(255,255,255,0.1);transform:translateY(-1px)}
        .session-card.current{border-color:rgba(75,232,216,0.32);background:rgba(75,232,216,0.04)}

        .revoke-btn{
          background:none;border:1px solid rgba(245,75,75,0.25);
          color:rgba(245,75,75,0.65);border-radius:7px;padding:5px 12px;
          cursor:pointer;font-size:11px;font-weight:600;flex-shrink:0;
          transition:all .18s;
        }
        .revoke-btn:hover{border-color:var(--danger);color:var(--danger);background:rgba(245,75,75,0.06)}

        .sign-out-all{
          width:100%;background:none;border:1px solid rgba(245,75,75,0.22);
          color:rgba(245,75,75,0.6);border-radius:9px;padding:10px;
          cursor:pointer;font-size:12px;font-weight:600;
          transition:all .2s;margin-top:12px;
        }
        .sign-out-all:hover{border-color:var(--danger);color:var(--danger);background:rgba(245,75,75,0.05)}

        .input-field:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 2px rgba(232,184,75,0.12)}

        /* Inline toggle btn */
        .toggle-btn{
          font-size:11px;font-weight:700;padding:5px 14px;border-radius:8px;
          cursor:pointer;transition:all .2s;flex-shrink:0;
        }
      `}</style>

      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>ACCOUNT</p>
            <h1>Profile &amp; Settings</h1>
            <p>Manage your identity, security &amp; notification preferences</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className="avatar" style={{ width:48, height:48, fontSize:18 }}>{av}</div>
            <div>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800 }}>{user?.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* ── LEFT ── */}
          <div>
            {/* Personal Info */}
            <div className="card-glint" style={{ marginBottom:16 }}>
              <p className="label" style={{ marginBottom:18 }}>PERSONAL INFO</p>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:22 }}>
                <div className="avatar" style={{ width:58, height:58, fontSize:22 }}>{av}</div>
                <div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800 }}>{user?.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>Vault Owner</div>
                  <span className="chip gold" style={{ fontSize:10, marginTop:6, display:'inline-flex' }}>🏆 VaultMERN</span>
                </div>
              </div>
              <Toast {...profileMsg} />
              <div className="form-group">
                <div className="input-label">FULL NAME</div>
                <input className="input-field" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="form-group" style={{ marginBottom:20 }}>
                <div className="input-label">EMAIL ADDRESS</div>
                <input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={saveProfile} disabled={profileBusy}>
                {profileBusy ? '⏳ Saving…' : '💾 Save Changes'}
              </button>
            </div>

            {/* ── SECURITY CARD ── */}
            <div className="card-glint" style={{ padding:0, overflow:'hidden' }}>
              {/* Header */}
              <div style={{
                padding:'16px 20px',
                borderBottom:'1px solid var(--border)',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'rgba(232,184,75,0.03)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background:'rgba(232,184,75,0.12)', border:'1px solid rgba(232,184,75,0.22)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                  }}>🛡️</div>
                  <div>
                    <p className="label" style={{ margin:0, fontSize:10 }}>SECURITY CENTER</p>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginTop:1 }}>Password &amp; active sessions</div>
                  </div>
                </div>
                <div style={{
                  display:'flex', alignItems:'center', gap:6,
                  fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20,
                  background:'rgba(75,245,154,0.08)', color:'var(--success)',
                  border:'1px solid rgba(75,245,154,0.22)',
                }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)', display:'inline-block' }}/>
                  Secured
                </div>
              </div>

              <div style={{ padding:'16px 20px 20px' }}>
                {/* ── Feature rows ── */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom: (pwOpen||sessionsOpen) ? 12 : 0 }}>

                  {/* Password row */}
                  <div className="sec-feature-row">
                    <div className="sec-icon-box" style={{ background:'rgba(75,232,216,0.08)', border:'1px solid rgba(75,232,216,0.18)' }}>🔐</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Password</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>bcrypt-hashed · encrypted at rest</div>
                    </div>
                    <button
                      className="toggle-btn"
                      onClick={() => { setPwOpen(v=>!v); if(sessionsOpen) setSessionsOpen(false); setPwMsg({ msg:'', type:'' }); }}
                      style={{
                        background: pwOpen ? 'rgba(232,184,75,0.12)' : 'transparent',
                        border: `1px solid ${pwOpen ? 'rgba(232,184,75,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: pwOpen ? 'var(--gold)' : 'var(--text-muted)',
                      }}>
                      {pwOpen ? '✕ Close' : 'Change →'}
                    </button>
                  </div>

                  {/* Sessions row */}
                  <div className="sec-feature-row">
                    <div className="sec-icon-box" style={{ background:'rgba(232,184,75,0.08)', border:'1px solid rgba(232,184,75,0.18)' }}>📱</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Active Sessions</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>Review &amp; revoke connected devices</div>
                    </div>
                    <button
                      className="toggle-btn"
                      onClick={() => { setSessionsOpen(v=>!v); if(pwOpen) setPwOpen(false); }}
                      style={{
                        background: sessionsOpen ? 'rgba(75,232,216,0.1)' : 'transparent',
                        border: `1px solid ${sessionsOpen ? 'rgba(75,232,216,0.35)' : 'rgba(255,255,255,0.1)'}`,
                        color: sessionsOpen ? 'var(--cyan)' : 'var(--text-muted)',
                      }}>
                      {sessionsOpen ? '✕ Close' : 'View →'}
                    </button>
                  </div>
                </div>

                {/* ── Change Password Panel ── */}
                <div className={`collapse ${pwOpen ? 'open' : ''}`}>
                  <div className="sec-panel pw-panel">
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--gold)', letterSpacing:'.07em', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                      🔑 CHANGE PASSWORD
                    </div>
                    <Toast {...pwMsg} />
                    <div className="form-group">
                      <div className="input-label">CURRENT PASSWORD</div>
                      <div className="pw-wrap">
                        <input className="input-field" type={showCur?'text':'password'} placeholder="Enter current password"
                          value={curPw} onChange={e=>setCurPw(e.target.value)} />
                        <button className="eye" onClick={()=>setShowCur(v=>!v)}>{showCur?'🙈':'👁'}</button>
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="input-label">NEW PASSWORD</div>
                      <div className="pw-wrap">
                        <input className="input-field" type={showNew?'text':'password'} placeholder="Min 6 characters"
                          value={newPw} onChange={e=>setNewPw(e.target.value)} />
                        <button className="eye" onClick={()=>setShowNew(v=>!v)}>{showNew?'🙈':'👁'}</button>
                      </div>
                      {newPw && pwStrength && (
                        <div style={{ marginTop:8 }}>
                          <div className="str-steps">
                            {[1,2,3,4].map(step => (
                              <div key={step} className="str-step"
                                style={{ background: step <= pwStrength.steps ? pwStrength.color : undefined }} />
                            ))}
                          </div>
                          <div style={{ fontSize:11, color:pwStrength.color, marginTop:5, fontWeight:600, display:'flex', justifyContent:'space-between' }}>
                            <span>{pwStrength.label}</span>
                            <span style={{ opacity:0.7, fontWeight:400 }}>{pwStrength.hint}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom:14 }}>
                      <div className="input-label">CONFIRM NEW PASSWORD</div>
                      <input className="input-field" type="password" placeholder="Repeat new password"
                        value={conPw} onChange={e=>setConPw(e.target.value)}
                        style={conPw&&conPw!==newPw?{borderColor:'var(--danger)'}:conPw&&conPw===newPw?{borderColor:'var(--success)'}:{}} />
                      {conPw&&conPw!==newPw&&<div style={{ fontSize:11, color:'var(--danger)', marginTop:4 }}>✕ Passwords don't match</div>}
                      {conPw&&conPw===newPw&&conPw.length>0&&<div style={{ fontSize:11, color:'var(--success)', marginTop:4 }}>✓ Passwords match</div>}
                    </div>
                    <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={changePassword} disabled={pwBusy}>
                      {pwBusy?'⏳ Updating…':'🔐 Update Password'}
                    </button>
                  </div>
                </div>

                {/* ── Sessions Panel ── */}
                <div className={`collapse ${sessionsOpen ? 'open' : ''}`}>
                  <div className="sec-panel sess-panel">
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--cyan)', letterSpacing:'.07em', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                      📋 ACTIVE SESSIONS
                    </div>
                    <Toast {...sessionsMsg} />
                    {sessionsLoad ? (
                      <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:13 }}>⏳ Loading sessions…</div>
                    ) : sessions.length === 0 ? (
                      <div style={{ textAlign:'center', padding:16, color:'var(--text-muted)', fontSize:13 }}>No active sessions found.</div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {sessions.map((s, i) => {
                          const isCurrent = s.jti === currentJti;
                          return (
                            <div key={s.jti||i} className={`session-card ${isCurrent?'current':''}`}>
                              <div style={{
                                width:36, height:36, borderRadius:10, flexShrink:0,
                                background: isCurrent ? 'rgba(75,232,216,0.1)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isCurrent ? 'rgba(75,232,216,0.3)' : 'var(--border)'}`,
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                              }}>
                                {s.icon||'🌐'}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
                                  <span style={{ fontSize:13, fontWeight:600 }}>{s.browser || 'Browser'}</span>
                                  {isCurrent && (
                                    <span style={{
                                      fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:20,
                                      background:'rgba(75,232,216,0.14)', color:'var(--cyan)',
                                      border:'1px solid rgba(75,232,216,0.28)', letterSpacing:'.05em',
                                    }}>● THIS DEVICE</span>
                                  )}
                                </div>
                                <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                  <span>{s.device || 'Web'}</span>
                                  <span style={{ opacity:0.3 }}>·</span>
                                  <span>{s.ip !== 'Unknown' ? s.ip : 'IP hidden'}</span>
                                  <span style={{ opacity:0.3 }}>·</span>
                                  <span>{timeAgo(s.createdAt)}</span>
                                </div>
                              </div>
                              {!isCurrent && (
                                <button className="revoke-btn" onClick={() => revokeSession(s.jti)}>
                                  Revoke
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {sessions.length > 1 && (
                          <button className="sign-out-all" onClick={revokeAll}>
                            🚪 Sign out of all other sessions
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div>
            {/* Notification Settings */}
            <div className="card-glint" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <p className="label">NOTIFICATION SETTINGS</p>
                <button className="btn-ghost" style={{ fontSize:11, padding:'6px 14px' }} onClick={saveToggles} disabled={togglesBusy}>
                  {togglesBusy?'⏳':'💾 Save'}
                </button>
              </div>
              <Toast {...togglesMsg} />
              {toggles.map((item, i) => (
                <div key={item.key} style={i===toggles.length-1?{borderBottom:'none'}:{}}>
                  <Toggle on={item.on} onFlip={()=>setToggles(prev=>prev.map(t=>t.key===item.key?{...t,on:!t.on}:t))}
                    label={item.label} sub={item.sub} icon={item.icon} />
                </div>
              ))}
            </div>

            {/* Account Info */}
            <div className="card" style={{ marginBottom:16 }}>
              <p className="label" style={{ marginBottom:14 }}>ACCOUNT INFO</p>
              {[
                { label:'Member since', value:user?.createdAt?new Date(user.createdAt).toLocaleDateString('en-GB',{month:'short',year:'numeric'}):'—' },
                { label:'Account ID',   value:user?.id?`#${String(user.id).slice(-6).toUpperCase()}`:'—' },
                { label:'Plan',         value:'VaultMERN Free' },
                { label:'Role',         value:'Vault Owner' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:10 }}>
                  <span style={{ color:'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight:500 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ borderColor:'rgba(245,75,75,0.3)', background:'rgba(245,75,75,0.04)' }}>
              <p className="label" style={{ color:'var(--danger)', marginBottom:12 }}>DANGER ZONE</p>
              <Toast {...exportMsg} />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button className="btn-ghost"
                  style={{ borderColor:'rgba(245,75,75,0.3)', color:'var(--danger)', fontSize:12 }}
                  onClick={handleExportJson} disabled={exporting || exportingDocx}>
                  {exporting ? '⏳ Exporting…' : '📤 Export All Data (JSON)'}
                </button>
                <button className="btn-ghost"
                  style={{ borderColor:'rgba(245,75,75,0.3)', color:'var(--danger)', fontSize:12 }}
                  onClick={handleExportDocx} disabled={exporting || exportingDocx}>
                  {exportingDocx ? '⏳ Building Document…' : '📄 Export All Data (Word .docx)'}
                </button>
                <div style={{ fontSize:11, color:'var(--text-muted)', paddingLeft:4 }}>
                  Exports all products across all vaults + notification history as JSON or a formatted Word document.
                </div>
                <button className="btn-ghost"
                  style={{ borderColor:'rgba(245,75,75,0.3)', color:'var(--danger)', fontSize:12, marginTop:4 }}
                  onClick={()=>{ if(window.confirm('Delete account? This cannot be undone.')) api('/auth/me','DELETE').catch(()=>{}); }}>
                  🗑️ Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;