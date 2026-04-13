import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

const NotificationPrefs = () => {
  const [emailAddr,    setEmailAddr]    = useState('');
  const [daysBefore,   setDaysBefore]   = useState(30);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    api('/notifications/prefs').then(prefs => {
      if (prefs) {
        setEmailAddr(prefs.emailAddr || '');
        setDaysBefore(
          Array.isArray(prefs.daysBefore) ? prefs.daysBefore[0] ?? 30 : prefs.daysBefore ?? 30
        );
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!emailAddr) return setError('Please enter an email address');
    setSaving(true); setError('');
    try {
      await api('/notifications/prefs', 'PUT', {
        emailAddr,
        daysBefore: [Number(daysBefore)],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom: 6 }}>SETTINGS</p>
            <h1>Notification Preferences</h1>
            <p>Configure how and when you receive warranty alerts</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding: 60, color:'var(--text-muted)' }}>Loading…</div>
        ) : (
          <div style={{ maxWidth: 560 }}>

            {/* How it works info card */}
            <div className="card" style={{
              borderColor: 'rgba(99,202,183,0.3)', background: 'rgba(99,202,183,0.04)',
              marginBottom: 20,
            }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <span style={{ fontSize:24, flexShrink:0 }}>🤖</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--cyan)', marginBottom:6 }}>
                    How Warranty Alerts Work
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.7 }}>
                    VaultMERN runs a daily scan every morning at <strong style={{color:'#fff'}}>8:00 AM</strong>.
                    If any product's warranty is expiring within your chosen window, 
                    a notification is created in-app and an email is sent to your alert address.
                    Each product is only alerted once per day.
                  </div>
                </div>
              </div>
            </div>

            {/* Prefs form */}
            <div className="card-glint">
              <p className="label" style={{ marginBottom:20 }}>📧 EMAIL ALERT SETTINGS</p>

              {error && (
                <div style={{
                  background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)',
                  borderRadius:8, padding:'10px 14px', fontSize:13,
                  color:'var(--danger)', marginBottom:16,
                }}>{error}</div>
              )}

              <div className="form-group" style={{ marginBottom:16 }}>
                <div className="input-label">ALERT EMAIL ADDRESS</div>
                <input className="input-field" type="email"
                  placeholder="you@example.com"
                  value={emailAddr}
                  onChange={e => setEmailAddr(e.target.value)} />
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                  Warranty alert emails will be sent to this address.
                  Leave blank to use your account email.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom:24 }}>
                <div className="input-label">SEND ALERT</div>
                <select className="input-field" value={daysBefore}
                  onChange={e => setDaysBefore(Number(e.target.value))}>
                  <option value={3}>3 days before expiry</option>
                  <option value={7}>7 days before expiry</option>
                  <option value={14}>14 days before expiry</option>
                  <option value={30}>30 days before expiry</option>
                  <option value={60}>60 days before expiry</option>
                  <option value={90}>90 days before expiry</option>
                </select>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                  You'll receive an email this many days before each warranty expires.
                </div>
              </div>

              {/* What the email looks like */}
              <div style={{
                background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)',
                borderRadius:10, padding:'14px 16px', marginBottom:20,
              }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, letterSpacing:'0.06em' }}>
                  PREVIEW — EMAIL SUBJECT
                </div>
                <div style={{
                  fontSize:13, color:'#fff', fontFamily:'monospace',
                  background:'rgba(0,0,0,0.3)', padding:'8px 12px', borderRadius:6,
                }}>
                  ⚠️ Warranty Alert: "Your Product" expires in {daysBefore} days
                </div>
              </div>

              <button className="btn-primary"
                style={{ width:'100%', justifyContent:'center' }}
                onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : saved ? '✅ Saved!' : '💾 Save Preferences'}
              </button>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default NotificationPrefs;