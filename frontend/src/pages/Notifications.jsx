import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

const TYPE_CFG = {
  warranty_expiring: { icon:'⚠️',  color:'var(--gold)',    label:'Warranty Expiring' },
  warranty_expired:  { icon:'🚨',  color:'var(--danger)',  label:'Warranty Expired'  },
  geo_alert:         { icon:'📍',  color:'var(--cyan)',    label:'Geo Alert'         },
  vault_invite:      { icon:'🔗',  color:'var(--cyan)',    label:'Vault Invite'      },
  live_expiring:     { icon:'⏰',  color:'var(--gold)',    label:'Expiring Soon'     },
  live_expired:      { icon:'🚨',  color:'var(--danger)',  label:'Expired'           },
  live_healthy:      { icon:'✅',  color:'var(--success)', label:'All Healthy'       },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
};

const daysLeft = (expiry) => Math.floor((new Date(expiry) - Date.now()) / 86400000);

const buildLiveAlerts = (products) => {
  const alerts = [];
  const now = new Date();
  products.forEach(p => {
    if (!p.warrantyExpiry) return;
    const d = daysLeft(p.warrantyExpiry);
    if (d < 0) {
      alerts.push({ _id:`live-expired-${p._id}`, isLive:true, isRead:false, type:'live_expired',
        productId:p, message:`"${p.name}" warranty has expired (${Math.abs(d)} day${Math.abs(d)!==1?'s':''} ago). Consider a service plan or extended warranty.`,
        createdAt:p.warrantyExpiry, channels:{}, urgency:0 });
    } else if (d <= 7) {
      alerts.push({ _id:`live-7-${p._id}`, isLive:true, isRead:false, type:'live_expiring',
        productId:p, message:`🔴 URGENT: "${p.name}" warranty expires in just ${d} day${d!==1?'s':''}! Act now.`,
        createdAt:now.toISOString(), channels:{}, urgency:1 });
    } else if (d <= 30) {
      alerts.push({ _id:`live-30-${p._id}`, isLive:true, isRead:false, type:'live_expiring',
        productId:p, message:`"${p.name}" warranty expires in ${d} day${d!==1?'s':''}. Expires on ${new Date(p.warrantyExpiry).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}.`,
        createdAt:now.toISOString(), channels:{}, urgency:2 });
    } else if (d <= 90) {
      alerts.push({ _id:`live-90-${p._id}`, isLive:true, isRead:false, type:'live_expiring',
        productId:p, message:`"${p.name}" warranty expires in ${d} days (${new Date(p.warrantyExpiry).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}). Keep this in mind.`,
        createdAt:now.toISOString(), channels:{}, urgency:3 });
    }
  });
  return alerts.sort((a, b) => a.urgency - b.urgency);
};

/* ── Alert Settings Panel ─────────────────────────────────────────────────── */
const AlertSettings = ({ onClose }) => {
  const [testSending, setTestSending] = useState(false);
  const [testMsg,     setTestMsg]     = useState({ text:'', ok:true });
  const [triggering,  setTriggering]  = useState(false);
  const [trigMsg,     setTrigMsg]     = useState('');
  const [channels,    setChannels]    = useState({ email:true, push:false });
  const [quietHours,  setQuietHours]  = useState({ enabled:false, from:'22:00', to:'08:00' });

  const handleTestEmail = async () => {
    setTestSending(true); setTestMsg({ text:'', ok:true });
    try {
      const res = await api('/notifications/test-email', 'POST');
      setTestMsg({ text:'✅ ' + (res.message || 'Test email sent!'), ok:true });
    } catch (err) {
      setTestMsg({ text:'❌ ' + (err.message || 'Failed to send'), ok:false });
    } finally {
      setTestSending(false);
      setTimeout(() => setTestMsg({ text:'', ok:true }), 5000);
    }
  };

  const handleTriggerCheck = async () => {
    setTriggering(true); setTrigMsg('');
    try {
      const res = await api('/notifications/test-run-checker', 'POST');
      setTrigMsg('✅ ' + (res.message || 'Checker ran!'));
    } catch (err) {
      setTrigMsg('❌ ' + (err.message || 'Failed'));
    } finally {
      setTriggering(false);
      setTimeout(() => setTrigMsg(''), 4000);
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={onClose}>
      <div style={{
        width:'100%', maxWidth:480,
        background:'var(--surface)', borderRadius:16,
        border:'1px solid var(--border)',
        boxShadow:'0 24px 60px rgba(0,0,0,0.5)',
        animation:'slideUp .22s cubic-bezier(.34,1.56,.64,1)',
        overflow:'hidden',
      }} onClick={e=>e.stopPropagation()}>

        {/* Modal header */}
        <div style={{
          padding:'18px 22px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10,
              background:'rgba(232,184,75,0.12)', border:'1px solid rgba(232,184,75,0.22)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚙️</div>
            <div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:800 }}>Alert Settings</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>Configure how you receive alerts</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:18, color:'var(--text-muted)', padding:'4px 8px', borderRadius:6,
            transition:'color .2s' }}
            onMouseEnter={e=>e.target.style.color='#fff'}
            onMouseLeave={e=>e.target.style.color='var(--text-muted)'}>
            ✕
          </button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Delivery channels */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', marginBottom:10 }}>DELIVERY CHANNELS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { key:'email', icon:'📧', label:'Email Alerts', sub:'Warranty alerts sent to your inbox' },
                { key:'push',  icon:'🔔', label:'In-App Push',  sub:'Real-time socket notifications'    },
              ].map(ch => (
                <div key={ch.key} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'12px 14px', borderRadius:10,
                  background: channels[ch.key] ? 'rgba(232,184,75,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${channels[ch.key] ? 'rgba(232,184,75,0.2)' : 'var(--border)'}`,
                  transition:'all .2s',
                }}>
                  <span style={{ fontSize:18, width:24, textAlign:'center' }}>{ch.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:1 }}>{ch.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{ch.sub}</div>
                  </div>
                  <button
                    onClick={() => setChannels(prev=>({...prev,[ch.key]:!prev[ch.key]}))}
                    style={{
                      width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', padding:0,
                      position:'relative', flexShrink:0,
                      background: channels[ch.key] ? 'linear-gradient(135deg,#e8b84b,#f5c96a)' : 'rgba(255,255,255,0.08)',
                      transition:'background .25s',
                    }}>
                    <span style={{
                      position:'absolute', top:2,
                      left: channels[ch.key] ? 'calc(100% - 22px)' : 2,
                      width:20, height:20, borderRadius:'50%',
                      background: channels[ch.key] ? '#fff' : 'rgba(255,255,255,0.25)',
                      transition:'left .25s cubic-bezier(.34,1.56,.64,1)',
                      display:'block',
                    }}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet hours */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', marginBottom:10 }}>QUIET HOURS</div>
            <div style={{
              padding:'12px 14px', borderRadius:10,
              background: quietHours.enabled ? 'rgba(75,232,216,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${quietHours.enabled ? 'rgba(75,232,216,0.2)' : 'var(--border)'}`,
              transition:'all .2s',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: quietHours.enabled ? 12 : 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16 }}>🌙</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>Mute notifications</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Silence alerts during set hours</div>
                  </div>
                </div>
                <button
                  onClick={() => setQuietHours(prev=>({...prev,enabled:!prev.enabled}))}
                  style={{
                    width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', padding:0,
                    position:'relative', flexShrink:0,
                    background: quietHours.enabled ? 'linear-gradient(135deg,#4be8d8,#63cab7)' : 'rgba(255,255,255,0.08)',
                    transition:'background .25s',
                  }}>
                  <span style={{
                    position:'absolute', top:2,
                    left: quietHours.enabled ? 'calc(100% - 22px)' : 2,
                    width:20, height:20, borderRadius:'50%',
                    background: quietHours.enabled ? '#fff' : 'rgba(255,255,255,0.25)',
                    transition:'left .25s cubic-bezier(.34,1.56,.64,1)',
                    display:'block',
                  }}/>
                </button>
              </div>
              {quietHours.enabled && (
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4, letterSpacing:'.06em' }}>FROM</div>
                    <input type="time" value={quietHours.from}
                      onChange={e=>setQuietHours(p=>({...p,from:e.target.value}))}
                      style={{ width:'100%', background:'var(--deep)', border:'1px solid var(--border)',
                        borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:13 }} />
                  </div>
                  <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:18 }}>→</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4, letterSpacing:'.06em' }}>TO</div>
                    <input type="time" value={quietHours.to}
                      onChange={e=>setQuietHours(p=>({...p,to:e.target.value}))}
                      style={{ width:'100%', background:'var(--deep)', border:'1px solid var(--border)',
                        borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:13 }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test & manual run */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', marginBottom:10 }}>DIAGNOSTICS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {testMsg.text && (
                <div style={{
                  padding:'9px 12px', borderRadius:8, fontSize:12,
                  background: testMsg.ok ? 'rgba(75,245,154,0.08)' : 'rgba(245,75,75,0.08)',
                  border: `1px solid ${testMsg.ok ? 'rgba(75,245,154,0.3)' : 'rgba(245,75,75,0.3)'}`,
                  color: testMsg.ok ? 'var(--success)' : 'var(--danger)',
                }}>{testMsg.text}</div>
              )}
              {trigMsg && (
                <div style={{
                  padding:'9px 12px', borderRadius:8, fontSize:12,
                  background: trigMsg.startsWith('✅') ? 'rgba(75,245,154,0.08)' : 'rgba(245,75,75,0.08)',
                  border: `1px solid ${trigMsg.startsWith('✅') ? 'rgba(75,245,154,0.3)' : 'rgba(245,75,75,0.3)'}`,
                  color: trigMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)',
                }}>{trigMsg}</div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleTestEmail} disabled={testSending} style={{
                  flex:1, padding:'10px', borderRadius:9, fontSize:12, fontWeight:600,
                  border:'1px solid rgba(75,232,216,0.3)', background:'rgba(75,232,216,0.07)',
                  color:'var(--cyan)', cursor:'pointer', opacity:testSending?0.6:1, transition:'all .2s',
                }}>
                  {testSending ? '⏳ Sending…' : '📧 Send Test Email'}
                </button>
                <button onClick={handleTriggerCheck} disabled={triggering} style={{
                  flex:1, padding:'10px', borderRadius:9, fontSize:12, fontWeight:600,
                  border:'1px solid rgba(232,184,75,0.3)', background:'rgba(232,184,75,0.07)',
                  color:'var(--gold)', cursor:'pointer', opacity:triggering?0.6:1, transition:'all .2s',
                }}>
                  {triggering ? '⏳ Running…' : '🔄 Run Checker'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ fontSize:13 }}>Done</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
const Notifications = () => {
  const navigate = useNavigate();

  const [dbNotifs,    setDbNotifs]    = useState([]);
  const [liveAlerts,  setLiveAlerts]  = useState([]);
  const [readLiveIds, setReadLiveIds] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('readLiveIds') || '[]')); }
    catch { return new Set(); }
  });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [filter,      setFilter]      = useState('all');
  const [markingAll,  setMarkingAll]  = useState(false);
  const [showSettings,setShowSettings]= useState(false);

  // Current (real-time socket) notifications
  const [currentNotifs,    setCurrentNotifs]    = useState([]);
  const [currentDismissed, setCurrentDismissed] = useState(new Set());
  const socketRef = useRef(null);

  const fetchDbNotifs = useCallback(async () => {
    try {
      const data = await api('/notifications');
      setDbNotifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Notifications fetch error:', err);
      setError('Could not load stored notifications.');
    }
  }, []);

  const fetchLiveAlerts = useCallback(async () => {
    try {
      const vaults = await api('/vaults/my');
      if (!vaults || vaults.length === 0) return;
      const allProducts = (
        await Promise.all(vaults.map(v => api(`/products?vaultId=${v._id}`).catch(() => [])))
      ).flat();
      setLiveAlerts(buildLiveAlerts(allProducts));
    } catch (err) { console.error('Live alerts error:', err); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchDbNotifs(), fetchLiveAlerts()]);
      setLoading(false);
    })();
  }, [fetchDbNotifs, fetchLiveAlerts]);

  // Socket.IO: listen for real-time new-notification events
  useEffect(() => {
    const trySocket = async () => {
      try {
        if (!window.io) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = '/socket.io/socket.io.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const token = localStorage.getItem('token');
        const socket = window.io(window.location.origin, {
          auth: { token }, transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;
        socket.on('new-notification', (notif) => {
          setCurrentNotifs(prev => {
            if (prev.some(n => n._id === notif._id)) return prev;
            return [{ ...notif, _receivedAt: new Date().toISOString() }, ...prev];
          });
          fetchDbNotifs();
        });
      } catch (err) { console.warn('[Notifications] Socket unavailable:', err.message); }
    };
    trySocket();
    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [fetchDbNotifs]);

  const markRead = async (id) => {
    if (!id) return;
    if (String(id).startsWith('live-')) {
      setReadLiveIds(prev => {
        const next = new Set(prev); next.add(id);
        try { sessionStorage.setItem('readLiveIds', JSON.stringify([...next])); } catch {}
        return next;
      });
      return;
    }
    try {
      await api(`/notifications/${id}/read`, 'PUT');
      setDbNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead:true } : n));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api('/notifications/read-all', 'PUT');
      setDbNotifs(prev => prev.map(n => ({ ...n, isRead:true })));
      const allLiveIds = liveAlerts.map(a => a._id);
      setReadLiveIds(prev => {
        const next = new Set([...prev, ...allLiveIds]);
        try { sessionStorage.setItem('readLiveIds', JSON.stringify([...next])); } catch {}
        return next;
      });
      setCurrentDismissed(prev => new Set([...prev, ...currentNotifs.map(n => n._id)]));
    } catch (err) { console.error(err); }
    finally { setMarkingAll(false); }
  };

  const dismissCurrent = (id) => setCurrentDismissed(prev => new Set([...prev, id]));

  // Build merged list
  const liveProductIds = new Set(liveAlerts.map(a => a.productId?._id || a.productId));
  const dedupedDb = dbNotifs.filter(n => {
    const pid = n.productId?._id || n.productId;
    return !pid || !liveProductIds.has(String(pid));
  });
  const hydratedLive = liveAlerts.map(a => ({ ...a, isRead: readLiveIds.has(a._id) }));
  const allNotifications = [...hydratedLive, ...dedupedDb];
  const unreadCount = allNotifications.filter(n => !n.isRead).length;
  const filtered = filter === 'unread' ? allNotifications.filter(n => !n.isRead) : allNotifications;
  const criticalCount = hydratedLive.filter(a => !a.isRead && a.urgency <= 1).length;
  const visibleCurrent = currentNotifs.filter(n => !currentDismissed.has(n._id));

  return (
    <div className="app-shell">
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:none} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes pulse   { 0%{box-shadow:0 0 0 0 rgba(232,184,75,0.5)} 70%{box-shadow:0 0 0 8px rgba(232,184,75,0)} 100%{box-shadow:0 0 0 0 rgba(232,184,75,0)} }

        /* ── Notification card ── */
        .notif-card {
          display:flex; align-items:flex-start; gap:14px;
          padding:16px 20px 14px;
          border-radius:13px; border:1px solid;
          transition:all .18s; animation: fadeIn .2s ease;
          position:relative;
        }
        .notif-card.unread { background:rgba(232,184,75,0.04); border-color:rgba(232,184,75,0.2); cursor:pointer; }
        .notif-card.unread:hover { background:rgba(232,184,75,0.07); border-color:rgba(232,184,75,0.32); }
        .notif-card.read   { background:var(--surface); border-color:var(--border); }
        .notif-card.live-expired { background:rgba(245,75,75,0.04); border-color:rgba(245,75,75,0.22); }
        .notif-card.live-7  { background:rgba(245,75,75,0.06); border-color:rgba(245,75,75,0.3); }

        /* Bottom-right action row inside card */
        .notif-actions {
          display:flex; align-items:center; justify-content:flex-end; gap:8px;
          margin-top:10px; padding-top:8px;
          border-top:1px solid rgba(255,255,255,0.05);
        }
        .notif-action-btn {
          font-size:11px; font-weight:600; padding:4px 12px; border-radius:7px;
          border:1px solid; cursor:pointer; transition:all .18s;
        }
        .mark-read-btn {
          border-color:rgba(232,184,75,0.3); color:var(--gold);
          background:rgba(232,184,75,0.06);
        }
        .mark-read-btn:hover { background:rgba(232,184,75,0.14); border-color:rgba(232,184,75,0.5); }
        .dismiss-btn-sm {
          border-color:rgba(255,255,255,0.1); color:var(--text-muted);
          background:transparent;
        }
        .dismiss-btn-sm:hover { border-color:rgba(245,75,75,0.3); color:var(--danger); background:rgba(245,75,75,0.06); }

        /* Current session card */
        .current-notif-card {
          display:flex; align-items:flex-start; gap:14px;
          padding:16px 20px 14px; border-radius:13px;
          border:1px solid rgba(232,184,75,0.35);
          background:rgba(232,184,75,0.06);
          animation: slideIn .3s ease;
          position:relative;
        }

        /* LIVE badge */
        .live-badge {
          position:absolute; top:11px; right:14px;
          font-size:9px; font-weight:800; letter-spacing:.08em;
          padding:2px 7px; border-radius:8px;
          background:rgba(75,232,216,0.1); color:var(--cyan);
          border:1px solid rgba(75,232,216,0.22);
        }

        /* Pulse dot */
        .pulse-dot {
          width:8px; height:8px; border-radius:50%; background:var(--gold);
          animation:pulse 1.6s infinite; flex-shrink:0; margin-top:4px;
        }

        /* Filter chip */
        .filter-chip {
          padding:6px 18px; border-radius:20px; font-size:12px;
          font-weight:600; cursor:pointer; border:1px solid; transition:all .2s;
          letter-spacing:.04em; text-transform:uppercase;
        }
      `}</style>

      {showSettings && <AlertSettings onClose={() => setShowSettings(false)} />}

      <Sidebar />
      <main className="main-content">

        {/* ── Header ── */}
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>ALERT CENTRE</p>
            <h1>Notifications</h1>
            <p>Live warranty alerts &amp; system messages — always up to date</p>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            {unreadCount > 0 && (
              <button className="btn-ghost" onClick={markAllRead} disabled={markingAll}
                style={{ fontSize:12, opacity: markingAll ? 0.6 : 1 }}>
                {markingAll ? '⏳ Marking…' : `✅ Mark All Read (${unreadCount})`}
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:600,
                border:'1px solid rgba(232,184,75,0.3)',
                background:'rgba(232,184,75,0.07)', color:'var(--gold)',
                cursor:'pointer', transition:'all .2s',
              }}>
              ⚙️ Alert Settings
            </button>
          </div>
        </div>

        {/* ── Current session notifications ── */}
        {visibleCurrent.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div className="pulse-dot" />
              <p className="label" style={{ margin:0, color:'var(--gold)' }}>CURRENT — LIVE THIS SESSION</p>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:10,
                background:'rgba(232,184,75,0.14)', color:'var(--gold)',
                border:'1px solid rgba(232,184,75,0.28)' }}>
                {visibleCurrent.length} NEW
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {visibleCurrent.map(n => {
                const cfg = TYPE_CFG[n.type] || { icon:'🔔', color:'var(--gold)', label:'Alert' };
                const prod = n.productId;
                const days = prod?.warrantyExpiry ? daysLeft(prod.warrantyExpiry) : null;
                return (
                  <div key={n._id} className="current-notif-card">
                    <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                      background:'rgba(232,184,75,0.14)', border:'1px solid rgba(232,184,75,0.35)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', color:'var(--gold)', textTransform:'uppercase' }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:8,
                          background:'rgba(232,184,75,0.18)', color:'var(--gold)',
                          border:'1px solid rgba(232,184,75,0.35)', letterSpacing:'.05em' }}>
                          JUST NOW
                        </span>
                        {n.channels?.email && (
                          <span style={{ fontSize:10, color:'var(--success)', fontWeight:600 }}>📧 Email sent</span>
                        )}
                      </div>
                      <div style={{ fontSize:14, color:'#fff', marginBottom:8, lineHeight:1.55 }}>{n.message}</div>
                      {prod && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:6 }}>
                          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:8,
                            background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)',
                            color:'var(--text-secondary)' }}>
                            📦 {prod.name}{prod.brand ? ` · ${prod.brand}` : ''}
                          </span>
                          {prod.warrantyExpiry && days !== null && (
                            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:8,
                              background: days<=7?'rgba(245,75,75,0.1)':'rgba(232,184,75,0.1)',
                              border:`1px solid ${days<=7?'rgba(245,75,75,0.3)':'rgba(232,184,75,0.3)'}`,
                              color: days<=7?'var(--danger)':'var(--gold)', fontWeight:600 }}>
                              {days<0?`Expired ${Math.abs(days)}d ago`:days===0?'Expires TODAY':`${days}d remaining`}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Bottom-right actions */}
                      <div className="notif-actions">
                        <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:'auto' }}>
                          🕐 {timeAgo(n._receivedAt || n.createdAt)}
                        </span>
                        {prod && (
                          <button className="notif-action-btn dismiss-btn-sm"
                            onClick={() => navigate('/products')}
                            style={{ borderColor:'rgba(232,184,75,0.25)', color:'var(--gold)', background:'transparent' }}>
                            View →
                          </button>
                        )}
                        <button className="notif-action-btn dismiss-btn-sm"
                          onClick={() => dismissCurrent(n._id)}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Urgent critical banner ── */}
        {criticalCount > 0 && (
          <div style={{
            background:'rgba(245,75,75,0.07)', border:'1px solid rgba(245,75,75,0.28)',
            borderRadius:11, padding:'14px 18px', marginBottom:18,
            display:'flex', alignItems:'center', gap:14,
          }}>
            <span style={{ fontSize:26 }}>🚨</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--danger)', marginBottom:3 }}>
                {criticalCount} Critical Warranty Alert{criticalCount>1?'s':''}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                You have products expiring within 7 days. Take action immediately.
              </div>
            </div>
          </div>
        )}

        {/* ── Filter row ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:8 }}>
            {['all','unread'].map(f => (
              <button key={f} className="filter-chip" onClick={() => setFilter(f)} style={{
                background: filter===f ? 'var(--gold)' : 'transparent',
                color:      filter===f ? '#000' : 'var(--text-muted)',
                borderColor:filter===f ? 'var(--gold)' : 'var(--border)',
              }}>
                {f==='all' ? `All (${allNotifications.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* Legend pushed right */}
          <div style={{ marginLeft:'auto', display:'flex', gap:14, flexWrap:'wrap' }}>
            {[
              { color:'var(--gold)',   label:'Current' },
              { color:'var(--cyan)',   label:'Live'    },
              { color:'var(--border)', label:'Stored'  },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:l.color, display:'inline-block', flexShrink:0 }}/>
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)',
            borderRadius:8, padding:'12px 16px', color:'var(--danger)', fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>
            Computing alerts from your vault…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>
              {filter==='unread' ? 'All caught up!' : 'All warranties healthy!'}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
              {filter==='unread' ? 'No unread notifications.' : 'No products expiring in the next 90 days.'}
            </div>
            {filter==='unread' && allNotifications.length > 0 && (
              <button className="btn-ghost" style={{ fontSize:12, marginBottom:10 }} onClick={() => setFilter('all')}>
                View all notifications
              </button>
            )}
            <button className="btn-primary" style={{ marginTop:4 }} onClick={() => navigate('/scan')}>
              + Scan a Bill
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(n => {
              const cfg    = TYPE_CFG[n.type] || { icon:'🔔', color:'var(--cyan)', label:n.type };
              const isLive = !!n.isLive;
              const isRead = !!n.isRead;
              const days   = n.productId?.warrantyExpiry ? daysLeft(n.productId.warrantyExpiry) : null;
              const isCrit = n.urgency <= 1;
              const prod   = n.productId;

              return (
                <div key={n._id}
                  className={`notif-card ${isRead?'read':'unread'} ${n.type==='live_expired'?'live-expired':''} ${n.urgency===1?'live-7':''}`}
                  onClick={() => {}}>

                  {isLive && <div className="live-badge">LIVE</div>}

                  <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                    background:`${cfg.color}16`, border:`1px solid ${cfg.color}38`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                    {cfg.icon}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Type + badges */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em',
                        color:cfg.color, textTransform:'uppercase' }}>
                        {cfg.label}
                      </span>
                      {!isRead && (
                        <span style={{ width:7, height:7, borderRadius:'50%',
                          background:'var(--gold)', boxShadow:'0 0 6px var(--gold)', flexShrink:0 }}/>
                      )}
                      {isCrit && (
                        <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:8,
                          background:'rgba(245,75,75,0.14)', color:'var(--danger)',
                          border:'1px solid rgba(245,75,75,0.28)', letterSpacing:'.05em' }}>
                          CRITICAL
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <div style={{ fontSize:14, color: isRead ? 'var(--text-muted)' : '#fff', marginBottom:8, lineHeight:1.55 }}>
                      {n.message}
                    </div>

                    {/* Product chips */}
                    {prod && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:11, padding:'3px 10px', borderRadius:8,
                          background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)',
                          color:'var(--text-secondary)' }}>
                          📦 {prod.name || 'Product'}{prod.brand ? ` · ${prod.brand}` : ''}
                        </span>
                        {prod.warrantyExpiry && days !== null && (
                          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:8,
                            background: days<0||days<=7 ? 'rgba(245,75,75,0.1)' : 'rgba(232,184,75,0.1)',
                            border:`1px solid ${days<0||days<=7 ? 'rgba(245,75,75,0.3)' : 'rgba(232,184,75,0.3)'}`,
                            color: days<0||days<=7 ? 'var(--danger)' : 'var(--gold)', fontWeight:600 }}>
                            {days<0?`Expired ${Math.abs(days)}d ago`:days===0?'Expires TODAY':`${days}d remaining`}
                          </span>
                        )}
                      </div>
                    )}

                    {/* ── Bottom-right actions ── */}
                    <div className="notif-actions">
                      {/* Left: meta */}
                      <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:'auto' }}>
                        🕐 {timeAgo(n.createdAt)}
                        {n.channels?.email && <span style={{ marginLeft:10 }}>📧 Email sent</span>}
                      </span>

                      {/* Right: action buttons */}
                      {prod && (
                        <button className="notif-action-btn dismiss-btn-sm"
                          onClick={e => { e.stopPropagation(); navigate('/products'); }}>
                          View →
                        </button>
                      )}
                      {!isRead && (
                        <button className="notif-action-btn mark-read-btn"
                          onClick={e => { e.stopPropagation(); markRead(n._id); }}>
                          ✓ Mark Read
                        </button>
                      )}
                      {isRead && (
                        <span style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>Read</span>
                      )}
                    </div>
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

export default Notifications;
