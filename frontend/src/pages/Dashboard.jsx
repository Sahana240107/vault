import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';

/* ── helpers ───────────────────────────────────────────────── */
const catEmoji = cat => ({ Electronics:'📺', Appliance:'🧊', Vehicle:'🚗', Furniture:'🛋️' }[cat] || '📦');
const catColor = cat => ({ Electronics:'var(--cyan)', Appliance:'var(--gold)', Vehicle:'var(--violet)', Furniture:'var(--success)' }[cat] || 'var(--text-muted)');

const daysLeft = expiry => Math.floor((new Date(expiry) - new Date()) / 86400000);

const warrantyChip = (exp) => {
  if (!exp) return null;
  const d = daysLeft(exp);
  if (d < 0)   return <span className="chip danger">Expired</span>;
  if (d <= 7)  return <span className="chip danger">{d}d left</span>;
  if (d <= 30) return <span className="chip warn">{d}d left</span>;
  return <span className="chip green">Active</span>;
};

const VAULT_TIPS = [
  { icon:'💡', title:'Scan Warranty Cards', body:'Upload your warranty card separately — AI will auto-extract the expiry date and serial number for you.', color:'var(--gold)' },
  { icon:'📍', title:'Geo-Aware Alerts Active', body:'Enable location in Analytics to see nearby service centers for products expiring within 30 days.', color:'var(--cyan)' },
  { icon:'🔐', title:'Secure Your Vault', body:'Add serial numbers to all products — this speeds up insurance claims and service requests by 3×.', color:'var(--success)' },
  { icon:'🤖', title:'AI OCR Accuracy', body:'Bills photographed under good lighting get 96%+ extraction accuracy. Avoid shadows on text.', color:'var(--violet)' },
  { icon:'📊', title:'Vault Health Score', body:'Your vault gets a higher score when bills, warranty dates, and serial numbers are all filled in.', color:'var(--gold)' },
  { icon:'👨‍👩‍👧', title:'Family Vault', body:'Invite family members to your vault — they can add products and see your shared warranty timeline.', color:'var(--cyan)' },
];

/* ════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user }                             = useAuth();
  const { vaults, activeVault, switchVault } = useVault();
  const navigate                             = useNavigate();
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [geoAlerts, setGeoAlerts] = useState([]);
  const [tipIdx,    setTipIdx]    = useState(0);

  useEffect(() => {
    if (!activeVault?._id) return;
    setLoading(true);
    api(`/products?vaultId=${activeVault._id}`)
      .then(data => { setProducts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeVault?._id]);

  useEffect(() => {
    if (!activeVault?._id || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const data = await api(`/geo/nearby?vaultId=${activeVault._id}&lat=${coords.latitude}&lng=${coords.longitude}&radiusKm=50`);
        setGeoAlerts(data.alerts || []);
      } catch { /* silent */ }
    }, () => {});
  }, [activeVault?._id]);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % VAULT_TIPS.length), 8000);
    return () => clearInterval(t);
  }, []);

  const now          = new Date();
  const expiringSoon = products.filter(p => { if (!p.warrantyExpiry) return false; const d = daysLeft(p.warrantyExpiry); return d >= 0 && d <= 30; });
  const expiring7    = products.filter(p => { if (!p.warrantyExpiry) return false; const d = daysLeft(p.warrantyExpiry); return d >= 0 && d <= 7; });
  const expired      = products.filter(p => p.warrantyExpiry && daysLeft(p.warrantyExpiry) < 0);
  const activeW      = products.filter(p => p.warrantyExpiry && daysLeft(p.warrantyExpiry) >= 0);
  const totalValue   = products.reduce((s, p) => s + (p.purchasePrice || 0), 0);
  const withBills    = products.filter(p => p.billImageUrl || p.billPdfUrl).length;
  const withSerial   = products.filter(p => p.serialNumber).length;
  const healthScore  = products.length === 0 ? 0 : Math.round(
    ((withBills / products.length) * 30) +
    ((activeW.length / products.length) * 25) +
    ((withSerial / products.length) * 15) +
    ((products.filter(p => p.category).length / products.length) * 15)
  );

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour      = now.getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today     = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const tip       = VAULT_TIPS[tipIdx];

  const notifications = [
    ...geoAlerts.slice(0, 2).map(a => ({
      icon:'📍', type:'geo',
      title:`${a.center.brand} Service Center Nearby`,
      sub:`${a.distanceKm} km away · ${a.products.map(p => p.name).join(', ')}`,
    })),
    ...expiring7.slice(0, 2).map(p => ({
      icon:'🚨', type:'danger',
      title:`Critical: ${p.name}`,
      sub:`Only ${daysLeft(p.warrantyExpiry)} day${daysLeft(p.warrantyExpiry)!==1?'s':''} left · ${p.brand||p.category||''}`,
    })),
    ...expiringSoon.filter(p => daysLeft(p.warrantyExpiry) > 7).slice(0, 2).map(p => ({
      icon:'⏰', type:'warn',
      title:`Warranty Expiring: ${p.name}`,
      sub:`${daysLeft(p.warrantyExpiry)} days left · ${p.brand||p.category||''}`,
    })),
    ...expired.slice(0, 1).map(p => ({
      icon:'⚠️', type:'expired',
      title:`Expired: ${p.name}`,
      sub:'Consider purchasing an extended warranty or service plan',
    })),
  ];
  if (notifications.length === 0)
    notifications.push({ icon:'🎉', type:'success', title:'All Warranties Healthy!', sub:'No expiries in the next 30 days.' });
  if (notifications.length < 3)
    notifications.push({ icon:'🤖', type:'info', title:'AI Scanner Ready', sub:'Upload a bill to auto-fill product details instantly.' });

  const timeline = products
    .filter(p => p.warrantyExpiry)
    .map(p => ({ ...p, days: daysLeft(p.warrantyExpiry) }))
    .filter(p => p.days >= -7 && p.days <= 90)
    .sort((a, b) => a.days - b.days)
    .slice(0, 7);

  // Category breakdown for mini chart
  const catBreakdown = Object.entries(
    products.reduce((acc, p) => { acc[p.category||'Other'] = (acc[p.category||'Other']||0)+1; return acc; }, {})
  ).sort((a,b) => b[1]-a[1]).slice(0,4);

  const fmtValue = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`;

  return (
    <div className="app-shell">
      <style>{`
        @keyframes tipFade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes countUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* Stat cards */
        .stat-card-v2 {
          border-radius:14px; padding:20px 22px;
          background:var(--surface); border:1px solid var(--border);
          display:flex; flex-direction:column; gap:6px;
          transition:transform .18s, border-color .18s;
          position:relative; overflow:hidden;
        }
        .stat-card-v2:hover { transform:translateY(-2px); border-color:rgba(255,255,255,0.12); }
        .stat-card-v2::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,0.03) 0%,transparent 60%);
          pointer-events:none;
        }
        .stat-accent { position:absolute; top:0; right:0; width:60px; height:60px; border-radius:0 14px 0 60px; opacity:.12; }

        /* Notification rows */
        .notif-row { display:flex; align-items:flex-start; gap:11px; padding:11px 13px; border-radius:10px; transition:filter .15s; }
        .notif-row:hover { filter:brightness(1.08); }
        .notif-row.warn    { background:rgba(245,168,75,0.07);  border:1px solid rgba(245,168,75,0.2);  }
        .notif-row.geo     { background:rgba(75,232,216,0.06);  border:1px solid rgba(75,232,216,0.18); }
        .notif-row.danger  { background:rgba(245,75,75,0.07);   border:1px solid rgba(245,75,75,0.2);   }
        .notif-row.expired { background:rgba(180,75,245,0.06);  border:1px solid rgba(180,75,245,0.18); }
        .notif-row.success { background:rgba(75,245,154,0.06);  border:1px solid rgba(75,245,154,0.18); }
        .notif-row.info    { background:rgba(75,232,216,0.04);  border:1px solid rgba(75,232,216,0.12); }

        /* Product mini cards */
        .product-mini {
          display:flex; align-items:center; gap:12px; padding:11px 14px;
          border-radius:11px; background:var(--deep); border:1px solid var(--border);
          cursor:pointer; transition:border-color .15s, transform .15s;
        }
        .product-mini:hover { border-color:var(--border-bright); transform:translateX(2px); }

        /* Timeline */
        .tl-item { display:flex; gap:14px; position:relative; }
        .tl-line { position:absolute; left:6px; top:16px; width:1px; bottom:-14px; background:var(--border); }
        .tl-dot { width:13px; height:13px; border-radius:50%; flex-shrink:0; margin-top:3px; border:2px solid; }

        /* Health score ring segments */
        .health-ring { transition:stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1); }

        /* Tip card */
        .tip-card { animation: tipFade .4s ease; }
        .tip-dot { width:6px; height:6px; border-radius:50%; cursor:pointer; transition:all .25s; flex-shrink:0; }

        /* Vault selector */
        .vault-btn {
          padding:5px 14px; border-radius:20px; font-size:11px; font-weight:600;
          cursor:pointer; border:1px solid; transition:all .18s;
        }

        /* Quick action */
        .quick-act {
          display:flex; align-items:center; gap:10px;
          padding:14px 16px; border-radius:12px;
          background:var(--deep); border:1px solid var(--border);
          cursor:pointer; transition:all .18s;
        }
        .quick-act:hover { border-color:var(--border-bright); transform:translateY(-1px); }
      `}</style>

      <Sidebar />
      <main className="main-content">

        {/* ══ HEADER ══ */}
        <div className="page-header" style={{ alignItems:'flex-start' }}>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'.1em', marginBottom:6 }}>
              {today.toUpperCase()}
            </p>
            <h1 style={{ marginTop:0, marginBottom:6 }}>{greeting}, {firstName} 👋</h1>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>
              {expiringSoon.length > 0
                ? `⚠️ ${expiringSoon.length} warrant${expiringSoon.length>1?'ies':'y'} expiring this month`
                : '✅ All warranties are healthy'}
              {expiring7.length > 0 && <span style={{ color:'var(--danger)', fontWeight:700 }}> · {expiring7.length} critical</span>}
            </p>

            {/* Vault selector */}
            {vaults.length > 1 && (
              <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
                {vaults.map(v => (
                  <button key={v._id} className="vault-btn" onClick={() => switchVault(v)} style={{
                    background: activeVault?._id===v._id ? 'rgba(232,184,75,0.15)' : 'var(--deep)',
                    color:      activeVault?._id===v._id ? 'var(--gold)'            : 'var(--text-muted)',
                    borderColor:activeVault?._id===v._id ? 'rgba(232,184,75,0.4)'   : 'var(--border)',
                  }}>🏠 {v.name}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
            <div className="live-dot">Live Sync</div>
            <button className="btn-ghost" style={{ fontSize:12 }} onClick={() => navigate('/notifications')}>
              🔔 Alerts {expiringSoon.length > 0 && <span style={{ marginLeft:4, background:'var(--danger)', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{expiringSoon.length}</span>}
            </button>
            <button className="btn-primary" onClick={() => navigate('/scan')}>+ Scan Bill</button>
          </div>
        </div>

        {/* ══ STAT CARDS ══ */}
        <div className="grid-4" style={{ marginBottom:22 }}>
          {[
            { icon:'📦', label:'TOTAL PRODUCTS',   value: loading ? '…' : products.length,   sub:`in ${activeVault?.name||'vault'}`, color:'#e8b84b', accent:'#e8b84b' },
            { icon:'🛡️', label:'ACTIVE WARRANTIES', value: activeW.length,                    sub:`${expiringSoon.length} expiring soon`, color:'#4be8d8', accent:'#4be8d8' },
            { icon:'💰', label:'TOTAL VALUE',       value: fmtValue(totalValue),              sub:'across all products', color:'#b84be8', accent:'#b84be8' },
            { icon:'🏆', label:'VAULT HEALTH',      value: `${healthScore}`, valueSuffix:'/100', sub: healthScore>=80?'Excellent 🔥':healthScore>=60?'Good 👍':'Needs data ⚡', color:'#4bf59a', accent:'#4bf59a' },
          ].map((s, i) => (
            <div key={i} className="stat-card-v2" style={{ animationDelay:`${i*60}ms` }}>
              <div className="stat-accent" style={{ background:s.accent }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.07em', color:'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize:20 }}>{s.icon}</span>
              </div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:s.color, lineHeight:1 }}>
                {s.value}{s.valueSuffix && <span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:400 }}>{s.valueSuffix}</span>}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ══ HEALTH BAR (only if products exist) ══ */}
        {products.length > 0 && (
          <div className="card" style={{ marginBottom:20, padding:'14px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em' }}>VAULT COMPLETENESS</div>
              <div style={{ display:'flex', gap:16 }}>
                {[
                  { label:'Bills',    val:withBills,    total:products.length, color:'var(--gold)'   },
                  { label:'Serials',  val:withSerial,   total:products.length, color:'var(--cyan)'   },
                  { label:'Warranty', val:activeW.length, total:products.length, color:'var(--success)' },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:item.color, display:'inline-block' }}/>
                    {item.label}: <strong style={{ color:item.color, marginLeft:2 }}>{item.val}/{item.total}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:3, height:6, borderRadius:6, overflow:'hidden' }}>
              {[
                { val:withBills/products.length,    color:'var(--gold)'   },
                { val:withSerial/products.length,   color:'var(--cyan)'   },
                { val:activeW.length/products.length, color:'var(--success)' },
              ].map((seg, i) => (
                <div key={i} style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${seg.val*100}%`, background:seg.color, borderRadius:3, transition:'width 1s ease' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ MAIN GRID ══ */}
        <div className="grid-2" style={{ marginBottom:20 }}>

          {/* ── WARRANTY TRACKER ── */}
          <div className="card-glint">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <p className="label">WARRANTY TRACKER</p>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginTop:4 }}>Expiring Soon</h3>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {expiring7.length > 0 && <span className="chip danger">🚨 {expiring7.length} urgent</span>}
                {expiringSoon.length > expiring7.length && <span className="chip warn">⚠ {expiringSoon.length - expiring7.length} soon</span>}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>Loading…</div>
            ) : expiringSoon.length === 0 ? (
              <div style={{ textAlign:'center', padding:'28px 0' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>All warranties healthy!</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Nothing expiring in the next 30 days</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {/* Header row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, padding:'6px 12px',
                  fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em',
                  borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                  <span>PRODUCT</span><span>EXPIRES</span><span>STATUS</span>
                </div>
                {expiringSoon.map(p => {
                  const d = daysLeft(p.warrantyExpiry);
                  const rowBg = d <= 7 ? 'rgba(245,75,75,0.04)' : d <= 14 ? 'rgba(245,168,75,0.04)' : 'transparent';
                  return (
                    <div key={p._id} onClick={() => navigate('/products')} style={{
                      display:'grid', gridTemplateColumns:'1fr auto auto', gap:10,
                      alignItems:'center', padding:'10px 12px', borderRadius:9,
                      background:rowBg, cursor:'pointer', transition:'background .15s',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:15 }}>{catEmoji(p.category)}</span>
                          {p.name}
                        </div>
                        {p.brand && <div style={{ fontSize:10, color:'var(--text-muted)', marginLeft:21 }}>{p.brand}</div>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {new Date(p.warrantyExpiry).toLocaleDateString('en-IN')}
                      </div>
                      <div>{warrantyChip(p.warrantyExpiry)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="btn-ghost" style={{ width:'100%', marginTop:14, fontSize:12, justifyContent:'center' }}
              onClick={() => navigate('/products')}>
              View All Products →
            </button>
          </div>

          {/* ── LIVE ALERTS ── */}
          <div className="card-glint">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <p className="label">LIVE ALERTS</p>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginTop:4 }}>Vault Notifications</h3>
              </div>
              <button className="btn-ghost" style={{ fontSize:11, padding:'6px 12px' }} onClick={() => navigate('/notifications')}>
                View All →
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {notifications.slice(0, 5).map((n, i) => (
                <div key={i} className={`notif-row ${n.type}`}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{n.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mini quick actions */}
            <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap' }}>
              {[
                { icon:'📷', label:'Scan Bill', action:'/scan' },
                { icon:'📊', label:'Analytics', action:'/analytics' },
                { icon:'⚙️', label:'Alert Prefs', action:'/notification-prefs' },
              ].map(q => (
                <button key={q.label} className="btn-ghost" style={{ flex:1, fontSize:11, padding:'7px 8px', justifyContent:'center', display:'flex', alignItems:'center', gap:5 }}
                  onClick={() => navigate(q.action)}>
                  <span>{q.icon}</span>{q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ BOTTOM ROW ══ */}
        <div className="grid-2" style={{ marginBottom:20 }}>

          {/* ── EXPIRY TIMELINE ── */}
          <div className="card-glint">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <p className="label">EXPIRY TIMELINE</p>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginTop:4 }}>Next 90 Days</h3>
              </div>
              <span className="chip cyan" style={{ fontSize:11 }}>📅 {timeline.length} items</span>
            </div>

            {timeline.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0', fontSize:13, color:'var(--text-muted)' }}>
                No warranty events in next 90 days
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {timeline.map((p, i) => {
                  const isUrgent  = p.days >= 0 && p.days <= 7;
                  const isWarning = p.days > 7 && p.days <= 30;
                  const isExpired = p.days < 0;
                  const dotColor  = isExpired ? 'var(--danger)' : isUrgent ? 'var(--danger)' : isWarning ? 'var(--warn)' : 'var(--success)';
                  const bgColor   = isExpired||isUrgent ? 'rgba(245,75,75,0.06)' : isWarning ? 'rgba(245,168,75,0.04)' : 'transparent';
                  return (
                    <div key={p._id} className="tl-item" style={{ background:bgColor, borderRadius:9, padding: bgColor!=='transparent' ? '8px 10px' : '0 2px' }}>
                      {i < timeline.length-1 && !bgColor!=='transparent' && <div className="tl-line"/>}
                      <div className="tl-dot" style={{ borderColor:dotColor, background:`${dotColor}30`, marginTop:2 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                            <span style={{ fontSize:14, flexShrink:0 }}>{catEmoji(p.category)}</span>
                            <span style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize:11, color:dotColor, fontWeight:800, flexShrink:0 }}>
                            {p.days < 0 ? `${Math.abs(p.days)}d ago` : p.days === 0 ? 'Today!' : `${p.days}d`}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, paddingLeft:20 }}>
                          {p.brand && `${p.brand} · `}
                          {new Date(p.warrantyExpiry).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Rotating tip */}
            <div className="card tip-card" key={tipIdx} style={{
              borderColor:`${tip.color}35`, background:`${tip.color}07`,
            }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:40, height:40, borderRadius:11, background:`${tip.color}15`,
                  border:`1px solid ${tip.color}30`, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, flexShrink:0 }}>{tip.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:tip.color, marginBottom:5 }}>{tip.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.55 }}>{tip.body}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:5, marginTop:12, alignItems:'center' }}>
                {VAULT_TIPS.map((_, i) => (
                  <div key={i} className="tip-dot" onClick={() => setTipIdx(i)} style={{
                    width: i === tipIdx ? 18 : 6, height:6,
                    background: i === tipIdx ? tip.color : 'var(--border)',
                  }} />
                ))}
                <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-muted)' }}>{tipIdx+1}/{VAULT_TIPS.length}</span>
              </div>
            </div>

            {/* Category breakdown */}
            {catBreakdown.length > 0 && (
              <div className="card-glint" style={{ padding:'16px 18px' }}>
                <p className="label" style={{ marginBottom:12 }}>CATEGORY BREAKDOWN</p>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {catBreakdown.map(([cat, count]) => {
                    const pct = Math.round((count / products.length) * 100);
                    const color = catColor(cat);
                    return (
                      <div key={cat}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                          <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span>{catEmoji(cat)}</span>
                            <span style={{ fontWeight:500 }}>{cat}</span>
                          </span>
                          <span style={{ color, fontWeight:700 }}>{count} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ height:4, borderRadius:4, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4, transition:'width 1s ease' }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent products */}
            <div className="card-glint" style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <p className="label">RECENTLY ADDED</p>
                <button className="btn-ghost" style={{ fontSize:11, padding:'5px 12px' }} onClick={() => navigate('/products')}>
                  All →
                </button>
              </div>

              {loading ? (
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>Loading…</p>
              ) : products.length === 0 ? (
                <div style={{ textAlign:'center', padding:'16px 0' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>No products yet</div>
                  <button className="btn-primary" onClick={() => navigate('/scan')}>+ Scan Your First Bill</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {products.slice(0, 3).map(p => (
                    <div key={p._id} className="product-mini" onClick={() => navigate('/products')}>
                      <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                        background:`${catColor(p.category)}14`, border:`1px solid ${catColor(p.category)}28`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                        {catEmoji(p.category)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:6 }}>
                          <span>{p.brand || p.category}</span>
                          {p.purchasePrice && <><span style={{ opacity:.3 }}>·</span><span>₹{p.purchasePrice.toLocaleString()}</span></>}
                        </div>
                      </div>
                      {warrantyChip(p.warrantyExpiry)}
                    </div>
                  ))}
                  <div className="product-mini" style={{ borderStyle:'dashed', justifyContent:'center', gap:8, opacity:.65 }}
                    onClick={() => navigate('/scan')}>
                    <span style={{ fontSize:18 }}>➕</span>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>Add Product via AI Scan</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;