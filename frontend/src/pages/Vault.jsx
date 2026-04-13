import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useVault } from '../context/VaultContext';

const Vault = () => {
  const { vaults, activeVault, switchVault, deleteVault, refreshVaults } = useVault();

  const [selectedVault, setSelectedVault] = useState(null);
  const [members,       setMembers]       = useState([]);
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteRole,    setInviteRole]    = useState('editor');
  const [inviteMsg,     setInviteMsg]     = useState({ text:'', ok:true });
  const [loading,       setLoading]       = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Auto-select active vault from context on first load
  useEffect(() => {
    if (activeVault && !selectedVault) {
      handleSelectVault(activeVault);
    }
  }, [activeVault]);

  // When vaults list refreshes, update selectedVault data too (so healthScore updates)
  useEffect(() => {
  if (selectedVault && vaults.length > 0) {
    const updated = vaults.find(v => v._id === selectedVault._id);
    if (updated) {
      setSelectedVault(updated);
      // Re-fetch members whenever vault data refreshes
      api(`/vaults/${updated._id}/members`)
        .then(setMembers)
        .catch(() => {});
    }
  }
}, [vaults]);

  const handleSelectVault = async (vault) => {
    setSelectedVault(vault);
    switchVault(vault);
    try {
      const mems = await api(`/vaults/${vault._id}/members`);
      setMembers(mems);
    } catch { setMembers([]); }
  };

  const createVault = async () => {
    const name = prompt('Vault name:');
    if (!name) return;
    try {
      await api('/vaults', 'POST', { name });
      refreshVaults();
    } catch (err) { alert(err.message); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedVault) return;
    setLoading(true);
    setInviteMsg({ text:'', ok:true });
    try {
      await api(`/vaults/${selectedVault._id}/invite`, 'POST', {
        email: inviteEmail.trim(),
        role:  inviteRole,
      });
      setInviteMsg({ text:`✓ ${inviteEmail} added as ${inviteRole}`, ok:true });
setInviteEmail('');
// Force re-fetch members AND refresh vault list (updates productCount/health)
const [mems] = await Promise.all([
  api(`/vaults/${selectedVault._id}/members`),
  refreshVaults(),
]);
setMembers(mems);
    } catch (err) {
      setInviteMsg({ text: err.message, ok:false });
    } finally { setLoading(false); }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api(`/vaults/${selectedVault._id}/member/${userId}`, 'DELETE');
      setMembers(prev => prev.filter(m => (m.userId?._id || m.userId) !== userId));
refreshVaults();
} catch (err) { alert(err.message); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api(`/vaults/${selectedVault._id}/member/${userId}`, 'PUT', { role: newRole });
      setMembers(prev => prev.map(m =>
        (m.userId?._id || m.userId) === userId ? { ...m, role: newRole } : m
      ));
    } catch (err) { alert(err.message); }
  };

  const handleDeleteVault = async (vault) => {
    if (!confirm(
      `⚠️ Delete "${vault.name}"?\n\nThis will permanently delete ALL products and service history inside it. This cannot be undone.`
    )) return;
    const typed = prompt(`Type the vault name "${vault.name}" to confirm deletion:`);
    if (typed !== vault.name) {
      alert('Name did not match. Vault not deleted.');
      return;
    }
    setDeleting(true);
    try {
      await deleteVault(vault._id);
      setSelectedVault(null);
      setMembers([]);
    } catch (err) {
      alert(err.message);
    } finally { setDeleting(false); }
  };

  const getHealthColor = (score) => {
    if (score >= 70) return 'var(--success)';
    if (score >= 40) return 'var(--warn)';
    return 'var(--danger)';
  };

  const getHealthLabel = (score) => {
    if (score >= 70) return 'Good';
    if (score >= 40) return 'Fair';
    if (score > 0)   return 'Needs Work';
    return 'Empty';
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* HEADER */}
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>COLLABORATIVE VAULT</p>
            <h1>Vault Management</h1>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>
              Real-time sync via Socket.io · Owner / Editor / Viewer roles
            </p>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div className="live-dot">● Live Sync</div>
            <button className="btn-primary" onClick={createVault}>+ New Vault</button>
          </div>
        </div>

        {/* VAULT CARDS */}
        <div className="grid-2" style={{ marginBottom:24 }}>
          {vaults.map(v => {
            const score       = v.healthScore || 0;
            const healthColor = getHealthColor(score);
            const isSelected  = selectedVault?._id === v._id;
            return (
              <div
                key={v._id}
                onClick={() => handleSelectVault(v)}
                className="card-glint"
                style={{
                  borderColor: isSelected ? 'var(--gold)' : 'var(--border)',
                  cursor:      'pointer',
                  transition:  'border-color 0.2s',
                }}
              >
                {/* Card header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:28 }}>🏠</span>
                    <div>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700 }}>{v.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>Role: {v.role}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className="chip gold">Active</span>
                    {v.role === 'owner' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteVault(v); }}
                        disabled={deleting}
                        title="Delete vault"
                        style={{
                          background:'none',
                          border:'1px solid rgba(245,75,75,0.3)',
                          color:'var(--danger)', borderRadius:6,
                          padding:'4px 8px', cursor:'pointer', fontSize:13,
                        }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                  <div style={{ background:'var(--deep)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:1, marginBottom:4 }}>PRODUCTS</div>
                    <div style={{ fontSize:20, fontWeight:700, fontFamily:'Syne,sans-serif', color:'var(--gold)' }}>
                      {v.productCount ?? '—'}
                    </div>
                  </div>
                  <div style={{ background:'var(--deep)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:1, marginBottom:4 }}>HEALTH</div>
                    <div style={{ fontSize:20, fontWeight:700, fontFamily:'Syne,sans-serif', color: healthColor }}>
                      {score}<span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>/100</span>
                    </div>
                  </div>
                </div>

                {/* Health bar */}
                <div style={{ marginBottom:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginBottom:5 }}>
                    <span>Vault Health Score</span>
                    <span style={{ color: healthColor, fontWeight:600 }}>{getHealthLabel(score)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width:`${score}%`, background: healthColor, transition:'width 0.6s ease' }}
                    />
                  </div>
                </div>

                {/* Health breakdown tips */}
                {score < 100 && (
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:8 }}>
                    {score === 0
                      ? 'Add products to start building your vault health score.'
                      : 'Add bills, serial numbers & service records to improve your score.'}
                  </div>
                )}
              </div>
            );
          })}

          {/* Create new vault card */}
          <div
            className="card"
            style={{ borderStyle:'dashed', display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer', minHeight:120 }}
            onClick={createVault}
          >
            <span style={{ fontSize:24 }}>➕</span>
            <span style={{ fontSize:14, color:'var(--text-muted)' }}>Create New Vault</span>
          </div>
        </div>

        {/* HEALTH SCORE BREAKDOWN — shown when a vault is selected */}
        {selectedVault && (
          <div className="card" style={{ marginBottom:20, borderColor:'var(--border)' }}>
            <p className="label" style={{ marginBottom:14 }}>HEALTH SCORE BREAKDOWN — {selectedVault.name}</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>
              {[
                { label:'Bills Uploaded',      icon:'🧾', points:30, tip:'Upload bill images to products' },
                { label:'Warranty Dates',       icon:'📅', points:25, tip:'Set warranty expiry dates' },
                { label:'Serial Numbers',       icon:'🔢', points:15, tip:'Add serial/IMEI numbers' },
                { label:'Service History',      icon:'🔧', points:15, tip:'Log service/repair records' },
                { label:'Categories Tagged',    icon:'🏷️', points:15, tip:'Ensure all products are categorized' },
              ].map(item => (
                <div key={item.label} style={{ background:'var(--deep)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:18, marginBottom:6 }}>{item.icon}</div>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6 }}>{item.tip}</div>
                  <div style={{ fontSize:11, color:'var(--cyan)' }}>+{item.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedVault && (
          <>
            {/* MEMBERS TABLE */}
            <div className="card-glint" style={{ marginBottom:20 }}>
              <p className="label" style={{ marginBottom:16 }}>MEMBERS — {selectedVault.name}</p>
              {members.length === 0 ? (
                <p style={{ color:'var(--text-muted)', fontSize:13 }}>No members yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NAME</th><th>EMAIL</th><th>ROLE</th><th>JOINED</th><th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => {
                      const uid   = m.userId?._id || m.userId;
                      const name  = m.userId?.name  || '—';
                      const email = m.userId?.email || '—';
                      return (
                        <tr key={uid}>
                          <td style={{ fontWeight:600 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{
                                width:28, height:28, borderRadius:'50%',
                                background:'var(--gold-dim)', border:'1px solid var(--gold)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:12, fontWeight:700, color:'var(--gold)',
                                flexShrink:0,
                              }}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              {name}
                            </div>
                          </td>
                          <td style={{ color:'var(--text-muted)', fontSize:12 }}>{email}</td>
                          <td>
                            {m.role === 'owner' ? (
                              <span className="chip gold">Owner</span>
                            ) : (
                              <select
                                className="input-field"
                                style={{ maxWidth:110, padding:'4px 8px', fontSize:12 }}
                                value={m.role}
                                onChange={e => handleRoleChange(uid, e.target.value)}
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            )}
                          </td>
                          <td style={{ fontSize:11, color:'var(--text-muted)' }}>
                            {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td>
                            {m.role !== 'owner' && (
                              <button
                                onClick={() => handleRemove(uid)}
                                style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:16 }}
                                title="Remove member"
                              >🗑</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* INVITE MEMBER */}
            <div className="card-glint">
              <p className="label" style={{ marginBottom:4 }}>INVITE MEMBER</p>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
                The person must already have a VaultMERN account. Invite them by their registered email.
              </p>

              {inviteMsg.text && (
                <div style={{
                  background:   inviteMsg.ok ? 'rgba(75,245,154,0.08)' : 'rgba(245,75,75,0.08)',
                  border:      `1px solid ${inviteMsg.ok ? 'var(--success)' : 'var(--danger)'}`,
                  borderRadius: 8, padding:'10px 14px', fontSize:13,
                  color:        inviteMsg.ok ? 'var(--success)' : 'var(--danger)',
                  marginBottom: 12,
                }}>
                  {inviteMsg.text}
                </div>
              )}

              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <input
                  className="input-field"
                  style={{ flex:1, minWidth:220 }}
                  placeholder="member@email.com (must have an account)"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteMsg({ text:'', ok:true }); }}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                />
                <select
                  className="input-field"
                  style={{ maxWidth:130 }}
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button className="btn-primary" onClick={handleInvite} disabled={loading}>
                  {loading ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Vault;