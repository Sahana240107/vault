import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Vault = () => {
  const [vaults, setVaults] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');

  useEffect(() => {
    api('/vaults/my').then(setVaults).catch(console.error);
  }, []);

  const createVault = async () => {
    const name = prompt('Vault name:');
    if (!name) return;
    await api('/vaults', 'POST', { name });
    const updated = await api('/vaults/my');
    setVaults(updated);
  };

  const handleInvite = async (vaultId) => {
    if (!inviteEmail) return;
    try {
      await api(`/vaults/${vaultId}/invite`, 'POST', { email: inviteEmail, role: inviteRole });
      alert('Member invited!');
      setInviteEmail('');
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>COLLABORATIVE VAULT</p>
            <h1>Vault Management</h1>
            <p>Real-time sync via Socket.io · Owner / Editor / Viewer roles</p>
          </div>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <div className="live-dot">Live Sync</div>
            <button className="btn-primary" onClick={createVault}>+ New Vault</button>
          </div>
        </div>

        {/* VAULT CARDS */}
        <div className="grid-2" style={{ marginBottom:24 }}>
          {vaults.map(v => (
            <div key={v._id} className="card-glint" style={{ borderColor:'var(--gold)',cursor:'pointer' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:28 }}>🏠</span>
                  <div>
                    <div style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700 }}>{v.name}</div>
                    <div style={{ fontSize:11,color:'var(--text-muted)' }}>Role: {v.role}</div>
                  </div>
                </div>
                <span className="chip gold">Active</span>
              </div>
              <div className="progress-bar" style={{ marginBottom:8 }}>
                <div className="progress-fill" style={{ width:`${v.healthScore || 0}%` }}></div>
              </div>
              <div style={{ fontSize:11,color:'var(--text-muted)' }}>
                Vault Health: <strong style={{ color:'var(--gold)' }}>{v.healthScore || 0}/100</strong>
              </div>
            </div>
          ))}
          <div className="card" style={{ borderStyle:'dashed',display:'flex',alignItems:'center',justifyContent:'center',gap:10,cursor:'pointer',minHeight:90 }} onClick={createVault}>
            <span style={{ fontSize:24 }}>➕</span>
            <span style={{ fontSize:14,color:'var(--text-muted)' }}>Create New Vault</span>
          </div>
        </div>

        {/* INVITE MEMBER */}
        {vaults.length > 0 && (
          <div className="card-glint">
            <p className="label" style={{ marginBottom:16 }}>INVITE MEMBER</p>
            <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
              <input className="input-field" style={{ flex:1,minWidth:200 }} placeholder="member@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <select className="input-field" style={{ maxWidth:130 }} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button className="btn-primary" onClick={() => handleInvite(vaults[0]._id)}>Send Invite</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vault;