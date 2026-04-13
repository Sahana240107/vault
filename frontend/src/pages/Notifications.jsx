import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

const TYPE_CFG = {
  warranty_expiring: { icon:'⚠️', color:'var(--gold)',   label:'Warranty Expiring' },
  warranty_expired:  { icon:'❌', color:'var(--danger)', label:'Warranty Expired'  },
  geo_alert:         { icon:'📍', color:'var(--cyan)',   label:'Geo Alert'         },
  vault_invite:      { icon:'🔗', color:'var(--cyan)',   label:'Vault Invite'      },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [filter,        setFilter]        = useState('all');

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // GET /api/notifications — auth header sent by api() helper automatically
        const data = await api('/notifications');
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Notifications fetch error:', err);
        setError('Could not load notifications. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      await api(`/notifications/${id}/read`, 'PUT');
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api('/notifications/read-all', 'PUT');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const filtered    = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>ALERT CENTRE</p>
            <h1>Notifications</h1>
            <p>Warranty alerts and system messages</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn-primary" onClick={markAllRead}
              style={{ alignSelf:'flex-start' }}>
              ✅ Mark All Read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {['all', 'unread'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'6px 18px', borderRadius:20, fontSize:12,
                fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase',
                cursor:'pointer', border:'1px solid',
                background: filter===f ? 'var(--gold)' : 'transparent',
                color:      filter===f ? '#000'        : 'var(--text-muted)',
                borderColor:filter===f ? 'var(--gold)' : 'var(--border)',
                transition:'all 0.2s' }}>
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div style={{ background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)',
            borderRadius:8, padding:'12px 16px', color:'var(--danger)', fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>
              {filter==='unread' ? 'No unread notifications' : 'No notifications yet'}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>
              {filter==='unread'
                ? 'You\'re all caught up!'
                : 'Warranty alerts will appear here when products are expiring soon.'}
            </div>
            {filter==='unread' && notifications.length > 0 && (
              <button className="btn-ghost" style={{ marginTop:14, fontSize:12 }}
                onClick={() => setFilter('all')}>
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(n => {
              const cfg = TYPE_CFG[n.type] || { icon:'🔔', color:'var(--cyan)', label: n.type };
              return (
                <div key={n._id}
                  onClick={() => { if (!n.isRead) markRead(n._id); }}
                  style={{ display:'flex', alignItems:'flex-start', gap:14,
                    padding:'16px 20px', borderRadius:12,
                    background: n.isRead ? 'var(--surface)' : 'rgba(232,184,75,0.06)',
                    border:`1px solid ${n.isRead ? 'var(--border)' : 'rgba(232,184,75,0.25)'}`,
                    cursor: n.isRead ? 'default' : 'pointer',
                    transition:'all 0.2s' }}>

                  {/* Icon */}
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                    background:`${cfg.color}18`, border:`1px solid ${cfg.color}40`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em',
                        color:cfg.color, textTransform:'uppercase' }}>
                        {cfg.label}
                      </span>
                      {!n.isRead && (
                        <span style={{ width:7, height:7, borderRadius:'50%',
                          background:'var(--gold)', flexShrink:0,
                          boxShadow:'0 0 6px var(--gold)' }} />
                      )}
                    </div>
                    <div style={{ fontSize:14, color: n.isRead ? 'var(--text-muted)' : '#fff', marginBottom:6 }}>
                      {n.message}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                        🕐 {timeAgo(n.createdAt)}
                      </span>
                      {n.channels?.email && (
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>📧 Email sent</span>
                      )}
                      {n.productId && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate('/products'); }}
                          style={{ fontSize:11, color:'var(--gold)', background:'none',
                            border:'none', cursor:'pointer', padding:0, textDecoration:'underline' }}>
                          View Product →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread hint */}
                  {!n.isRead && (
                    <div style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0, marginTop:2 }}>
                      tap to dismiss
                    </div>
                  )}
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