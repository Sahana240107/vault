import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U';

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>ACCOUNT</p>
            <h1>Profile & Settings</h1>
            <p>Manage your identity, notifications, and preferences</p>
          </div>
        </div>

        <div className="grid-2">
          <div>
            <div className="card-glint" style={{ marginBottom:16 }}>
              <p className="label" style={{ marginBottom:16 }}>PERSONAL INFO</p>
              <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:20 }}>
                <div className="avatar" style={{ width:56,height:56,fontSize:20 }}>{initials}</div>
                <div>
                  <div style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800 }}>{user?.name}</div>
                  <div style={{ fontSize:12,color:'var(--text-muted)' }}>Vault Owner</div>
                  <div style={{ fontSize:11,marginTop:4 }}><span className="chip gold" style={{ fontSize:10 }}>🏆 VaultMERN</span></div>
                </div>
              </div>
              <div className="form-group">
                <div className="input-label">FULL NAME</div>
                <input className="input-field" defaultValue={user?.name} />
              </div>
              <div className="form-group">
                <div className="input-label">EMAIL</div>
                <input className="input-field" defaultValue={user?.email} />
              </div>
              <button className="btn-primary" style={{ width:'100%',justifyContent:'center' }}>Save Changes</button>
            </div>

            <div className="card-glint">
              <p className="label" style={{ marginBottom:14 }}>SECURITY</p>
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                <button className="btn-ghost" style={{ width:'100%',textAlign:'left' }}>🔑 Change Password</button>
                <button className="btn-ghost" style={{ width:'100%',textAlign:'left' }}>📱 Setup 2FA</button>
                <button className="btn-ghost" style={{ width:'100%',textAlign:'left' }}>📋 View Active Sessions</button>
              </div>
            </div>
          </div>

          <div>
            <div className="card-glint" style={{ marginBottom:16 }}>
              <p className="label" style={{ marginBottom:4 }}>NOTIFICATION SETTINGS</p>
              {[
                { label:'Warranty Expiry Alerts', sub:'30 days before expiry', on:true },
                { label:'Geo-Aware Service Alerts', sub:'Push when near service center', on:true },
                { label:'Family Vault Activity', sub:'When members add/edit products', on:true },
                { label:'AI Scan Summaries', sub:'After each bill scan', on:false },
                { label:'Weekly Vault Digest', sub:'Email summary every Monday', on:true },
              ].map(item => (
                <div key={item.label} className="toggle-row">
                  <div>
                    <div style={{ fontSize:13,fontWeight:500 }}>{item.label}</div>
                    <div style={{ fontSize:11,color:'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                  <div className={`toggle-switch ${item.on ? 'on' : ''}`}></div>
                </div>
              ))}
            </div>

            <div className="card" style={{ borderColor:'rgba(245,75,75,0.3)',background:'rgba(245,75,75,0.04)' }}>
              <p className="label" style={{ color:'var(--danger)',marginBottom:12 }}>DANGER ZONE</p>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                <button className="btn-ghost" style={{ borderColor:'rgba(245,75,75,0.3)',color:'var(--danger)',fontSize:12 }}>Export All Data (JSON)</button>
                <button className="btn-ghost" style={{ borderColor:'rgba(245,75,75,0.3)',color:'var(--danger)',fontSize:12 }}>Delete Account</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;