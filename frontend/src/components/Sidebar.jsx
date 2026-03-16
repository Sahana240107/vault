import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U';

  const nav = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard', section: 'MAIN' },
    { path: '/products',  icon: '📦', label: 'Products' },
    { path: '/scan',      icon: '📷', label: 'Scan Bill' },
    { path: '/vault',     icon: '🗄️', label: 'Vault Mgmt', section: 'VAULT' },
    { path: '/analytics', icon: '✨', label: 'Analytics' },
    { path: '/profile',   icon: '👤', label: 'Profile', section: 'ACCOUNT' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Vault<br />
        <small>MERN · v1.0</small>
      </div>

      {nav.map((item) => (
        <div key={item.path}>
          {item.section && <div className="nav-section">{item.section}</div>}
          <div
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">Vault Owner</div>
          </div>
          <span className="notif-dot"></span>
        </div>
        <div
          style={{ marginTop: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '6px' }}
          onClick={logout}
        >
          Sign out →
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;