import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth }                  from '../context/AuthContext';
import { useNotifications }         from '../context/NotificationContext';

const Sidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout }   = useAuth();
  const { unreadCount }    = useNotifications();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const nav = [
    { path: '/dashboard',          icon: '📊', label: 'Dashboard',       section: 'MAIN' },
    { path: '/products',           icon: '📦', label: 'Products'         },
    { path: '/scan',               icon: '📷', label: 'Scan Bill'        },
    { path: '/bills',              icon: '🗂️', label: 'Bills & Warranty' },
    { path: '/notifications',      icon: '🔔', label: 'Notifications',   badge: unreadCount },
    { path: '/vault',              icon: '🗄️', label: 'Vault Mgmt',      section: 'VAULT'   },
    { path: '/analytics',          icon: '✨', label: 'Analytics'        },
    { path: '/profile',            icon: '👤', label: 'Profile',         section: 'ACCOUNT' },
    { path: '/notification-prefs', icon: '⚙️', label: 'Alert Settings'  },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Vault<br />
        <small>MERN · v1.0</small>
      </div>

      {nav.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <div key={item.path}>
            {item.section && <div className="nav-section">{item.section}</div>}
            <div
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              style={{ position: 'relative' }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>

              {/* Live unread badge */}
              {item.badge > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: 'var(--gold)', color: '#000',
                  fontSize: 10, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px', flexShrink: 0,
                  boxShadow: '0 0 8px rgba(232,184,75,0.6)',
                  animation: 'pulse-badge 2s ease infinite',
                }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse-badge {
          0%, 100% { box-shadow: 0 0 8px rgba(232,184,75,0.6); }
          50%       { box-shadow: 0 0 14px rgba(232,184,75,0.9); }
        }
      `}</style>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">Vault Owner</div>
          </div>
          {/* Green dot when socket is live — always shows for logged-in users */}
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 6px var(--success)',
            flexShrink: 0,
          }} />
        </div>
        <div
          style={{
            marginTop: 10, cursor: 'pointer', fontSize: 12,
            color: 'var(--text-muted)', textAlign: 'center', padding: 6,
          }}
          onClick={logout}
        >
          Sign out →
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;