import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

const DAYS_OPTIONS = [
  { value: 1,  label: '1d',  full: '1 Day',    desc: 'Last-minute'  },
  { value: 3,  label: '3d',  full: '3 Days',   desc: 'Very urgent'  },
  { value: 7,  label: '7d',  full: '1 Week',   desc: 'Recommended'  },
  { value: 14, label: '14d', full: '2 Weeks',  desc: 'Good buffer'  },
  { value: 30, label: '30d', full: '1 Month',  desc: 'Plan ahead'   },
  { value: 60, label: '60d', full: '2 Months', desc: 'Early bird'   },
  { value: 90, label: '90d', full: '3 Months', desc: 'Max lead time'},
];

const NotificationPrefs = () => {
  const [emailAddr,    setEmailAddr]    = useState('');
  const [selectedDays, setSelectedDays] = useState([7, 30]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [testSending,  setTestSending]  = useState(false);
  const [testResult,   setTestResult]   = useState('');
  const [error,        setError]        = useState('');
  const [trigRunning,  setTrigRunning]  = useState(false);
  const [trigResult,   setTrigResult]   = useState('');

  useEffect(() => {
    api('/notifications/prefs')
      .then(prefs => {
        if (prefs) {
          setEmailAddr(prefs.emailAddr || '');
          setSelectedDays(
            Array.isArray(prefs.daysBefore) && prefs.daysBefore.length
              ? prefs.daysBefore : [7, 30]
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (val) =>
    setSelectedDays(prev =>
      prev.includes(val)
        ? prev.filter(d => d !== val)
        : [...prev, val].sort((a, b) => a - b)
    );

  const handleSave = async () => {
    if (!emailAddr.trim()) return setError('Please enter an email address');
    if (selectedDays.length === 0) return setError('Select at least one alert window');
    setSaving(true); setError(''); setTestResult('');
    try {
      await api('/notifications/prefs', 'PUT', {
        emailAddr: emailAddr.trim(),
        daysBefore: selectedDays,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    if (!emailAddr.trim()) return setError('Enter an email address first');
    setTestSending(true); setTestResult(''); setError('');
    try {
      const res = await api('/notifications/test-email', 'POST');
      setTestResult(res.message || 'Test email sent!');
    } catch (err) { setError(err.message); }
    finally { setTestSending(false); }
  };

  const handleTriggerCheck = async () => {
    setTrigRunning(true); setTrigResult('');
    try {
      const res = await api('/notifications/test-run-checker', 'POST');
      setTrigResult(res.message || 'Check complete!');
    } catch (err) { setTrigResult('Failed: ' + err.message); }
    finally { setTrigRunning(false); }
  };

  const now = new Date();
  const scanTime = '08:00 AM IST';

  return (
    <div className="app-shell">
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(232,184,75,0.4)} 50%{box-shadow:0 0 0 8px rgba(232,184,75,0)} }
        .day-pill {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          width:64px; height:64px; border-radius:14px; cursor:pointer;
          border:1.5px solid; transition:all .18s cubic-bezier(.34,1.56,.64,1);
          user-select:none; position:relative;
        }
        .day-pill.active  { border-color:var(--gold); background:rgba(232,184,75,0.12); }
        .day-pill.inactive{ border-color:rgba(255,255,255,0.08); background:rgba(255,255,255,0.02); }
        .day-pill.active:hover  { transform:scale(1.08); }
        .day-pill.inactive:hover{ border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.04); }
        .day-pill .check {
          position:absolute; top:-6px; right:-6px;
          width:16px; height:16px; border-radius:50%;
          background:var(--gold); display:flex; align-items:center; justify-content:center;
          font-size:9px; color:#000; font-weight:800;
          animation: pulse 2s infinite;
        }
        .stat-ring-card {
          background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);
          border-radius:14px; padding:20px; display:flex; flex-direction:column;
          align-items:center; gap:8px; text-align:center;
        }
        .timeline-row {
          display:flex; align-items:center; gap:12px;
          padding:12px 16px; border-radius:10px;
          background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);
        }
        .timeline-dot {
          width:10px; height:10px; border-radius:50%; flex-shrink:0;
        }
        .how-step {
          display:flex; gap:14px; align-items:flex-start;
          padding:14px 16px; border-radius:12px;
          background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);
          animation: fadeUp .3s ease both;
        }
        .step-num {
          width:28px; height:28px; border-radius:8px; flex-shrink:0;
          background:rgba(232,184,75,0.12); border:1px solid rgba(232,184,75,0.3);
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:800; color:var(--gold);
        }
      `}</style>

      <Sidebar />
      <main className="main-content">

        {/* Header */}
        <div className="page-header" style={{ marginBottom: 28 }}>
          <div>
            <p className="label" style={{ marginBottom: 6 }}>SETTINGS</p>
            <h1>Alert Settings</h1>
            <p>Configure when and how you receive warranty alerts</p>
          </div>
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'8px 16px', borderRadius:20,
            background:'rgba(75,232,216,0.08)', border:'1px solid rgba(75,232,216,0.25)',
            fontSize:13, fontWeight:600, color:'var(--cyan)',
          }}>
            <span style={{ fontSize:16 }}>🕗</span>
            Daily scan at <strong style={{ color:'#fff' }}>{scanTime}</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading…</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

            {/* ══════════════ LEFT COLUMN ══════════════ */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* How it works */}
              <div className="card" style={{ borderColor:'rgba(99,202,183,0.2)', background:'rgba(99,202,183,0.03)' }}>
                <p className="label" style={{ marginBottom:14, color:'var(--cyan)' }}>HOW WARRANTY ALERTS WORK</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { n:'1', icon:'📦', text:'You add a product with a warranty expiry date' },
                    { n:'2', icon:'🔍', text:'VaultMERN scans your vault every day at 8:00 AM IST' },
                    { n:'3', icon:'📧', text:'An email + in-app notification fires once per day per window' },
                    { n:'4', icon:'⚡', text:'Saving preferences triggers an immediate check right now' },
                  ].map((s, i) => (
                    <div key={s.n} className="how-step" style={{ animationDelay:`${i*0.05}s` }}>
                      <div className="step-num">{s.n}</div>
                      <div>
                        <span style={{ fontSize:14 }}>{s.icon} </span>
                        <span style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>{s.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert Timing */}
              <div className="card-glint">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                      <span style={{ fontSize:20 }}>🚨</span>
                      <p className="label">ALERT TIMING</p>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>How many days before expiry to alert you</div>
                  </div>
                  {selectedDays.length > 0 && (
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--gold)' }}>
                      {selectedDays.length} window{selectedDays.length > 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                {/* Day pills */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                  {DAYS_OPTIONS.map(opt => {
                    const active = selectedDays.includes(opt.value);
                    return (
                      <div key={opt.value}
                        className={`day-pill ${active ? 'active' : 'inactive'}`}
                        onClick={() => toggleDay(opt.value)}>
                        {active && <div className="check">✓</div>}
                        <div style={{ fontSize:14, fontWeight:800, color: active ? 'var(--gold)' : '#888' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize:9, color: active ? 'rgba(232,184,75,0.7)' : '#555' }}>
                          {opt.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected summary */}
                {selectedDays.length > 0 ? (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>Alerts will fire:</span>
                    {selectedDays.map(d => (
                      <span key={d} style={{
                        fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:10,
                        background:'rgba(232,184,75,0.12)', color:'var(--gold)',
                        border:'1px solid rgba(232,184,75,0.3)',
                      }}>
                        {DAYS_OPTIONS.find(o => o.value === d)?.full} before
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:'var(--danger)' }}>⚠️ Select at least one window</div>
                )}
              </div>

              {/* Email Destination */}
              <div className="card-glint">
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:20 }}>📧</span>
                  <div>
                    <p className="label">EMAIL DESTINATION</p>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Where warranty alerts are delivered</div>
                  </div>
                </div>

                {error && (
                  <div style={{ background:'rgba(245,75,75,0.1)', border:'1px solid rgba(245,75,75,0.3)',
                    borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--danger)', marginBottom:12 }}>
                    {error}
                  </div>
                )}
                {testResult && (
                  <div style={{ background:'rgba(76,175,80,0.1)', border:'1px solid rgba(76,175,80,0.3)',
                    borderRadius:8, padding:'10px 14px', fontSize:12, color:'#4caf50', marginBottom:12 }}>
                    ✅ {testResult}
                  </div>
                )}

                <div className="input-label" style={{ marginBottom:8 }}>ALERT EMAIL ADDRESS</div>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@example.com"
                  value={emailAddr}
                  onChange={e => setEmailAddr(e.target.value)}
                  style={{ marginBottom:8 }}
                />
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:16 }}>
                  Leave blank to use your account email.
                </div>

                {/* Email preview */}
                <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.06em', marginBottom:6 }}>
                    EMAIL PREVIEW
                  </div>
                  <div style={{ fontSize:12, color:'#fff', fontFamily:'monospace' }}>
                    ⚠️ Warranty Alert: "Your Product" expires in{' '}
                    <span style={{ color:'var(--gold)' }}>
                      {selectedDays.length > 0 ? selectedDays[0] : '?'} days
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    onClick={handleTestEmail}
                    disabled={testSending}
                    style={{ flex:1, padding:'10px', borderRadius:8, fontSize:12, fontWeight:600,
                      border:'1px solid rgba(75,232,216,0.3)', background:'rgba(75,232,216,0.08)',
                      color:'var(--cyan)', cursor:'pointer', opacity: testSending ? 0.6 : 1 }}>
                    {testSending ? '⏳ Sending…' : '📨 Send Test Email'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                    style={{ flex:2, justifyContent:'center' }}>
                    {saving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save Preferences'}
                  </button>
                </div>

                {saved && (
                  <div style={{ marginTop:10, fontSize:11, color:'var(--cyan)', textAlign:'center' }}>
                    ⚡ Checking your products right now…
                  </div>
                )}
              </div>

            </div>

            {/* ══════════════ RIGHT COLUMN ══════════════ */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Live status card */}
              <div className="card" style={{ borderColor:'rgba(232,184,75,0.2)', background:'rgba(232,184,75,0.03)' }}>
                <p className="label" style={{ marginBottom:14, color:'var(--gold)' }}>ALERT CHANNELS ACTIVE</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { icon:'📧', label:'Email Alerts',        status:'Active', color:'var(--success)', on:true },
                    { icon:'🔔', label:'In-App Notifications', status:'Active', color:'var(--success)', on:true },
                    { icon:'⚡', label:'Real-Time Push',       status:'Active', color:'var(--success)', on:true },
                  ].map(ch => (
                    <div key={ch.label} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'12px 14px', borderRadius:10,
                      background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:18 }}>{ch.icon}</span>
                        <span style={{ fontSize:13, fontWeight:500 }}>{ch.label}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background: ch.on ? 'var(--success)' : '#444',
                          display:'inline-block', boxShadow: ch.on ? '0 0 6px var(--success)' : 'none' }}/>
                        <span style={{ fontSize:11, color:ch.color }}>{ch.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert schedule timeline */}
              <div className="card-glint">
                <p className="label" style={{ marginBottom:14 }}>📅 YOUR ALERT SCHEDULE</p>
                {selectedDays.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:20 }}>
                    Select alert windows on the left to see your schedule.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[...selectedDays].sort((a,b)=>b-a).map((d, i) => {
                      const color = d <= 7 ? 'var(--danger)' : d <= 30 ? 'var(--gold)' : 'var(--cyan)';
                      const opt   = DAYS_OPTIONS.find(o => o.value === d);
                      return (
                        <div key={d} className="timeline-row" style={{ animationDelay:`${i*0.06}s` }}>
                          <div className="timeline-dot" style={{ background: color, boxShadow:`0 0 6px ${color}` }}/>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600 }}>{opt?.full} before expiry</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                              Email + in-app notification fires
                            </div>
                          </div>
                          <div style={{ fontSize:11, fontWeight:700, color }}>D-{d}</div>
                        </div>
                      );
                    })}
                    <div className="timeline-row" style={{ borderColor:'rgba(245,75,75,0.3)', background:'rgba(245,75,75,0.04)' }}>
                      <div className="timeline-dot" style={{ background:'var(--danger)', boxShadow:'0 0 6px var(--danger)' }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--danger)' }}>Expiry Date</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>Warranty expires — take action!</div>
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--danger)' }}>D-0</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual trigger */}
              <div className="card" style={{ borderColor:'rgba(75,232,216,0.15)', background:'rgba(75,232,216,0.03)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:20 }}>🔄</span>
                  <div>
                    <p className="label" style={{ color:'var(--cyan)' }}>MANUAL WARRANTY CHECK</p>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Run the checker right now without waiting for 8 AM</div>
                  </div>
                </div>
                {trigResult && (
                  <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, marginBottom:10,
                    background: trigResult.startsWith('Failed') ? 'rgba(245,75,75,0.1)' : 'rgba(75,245,154,0.08)',
                    border: `1px solid ${trigResult.startsWith('Failed') ? 'rgba(245,75,75,0.3)' : 'rgba(75,245,154,0.25)'}`,
                    color: trigResult.startsWith('Failed') ? 'var(--danger)' : 'var(--success)',
                  }}>{trigResult.startsWith('Failed') ? '❌ ' : '✅ '}{trigResult}</div>
                )}
                <button
                  onClick={handleTriggerCheck}
                  disabled={trigRunning}
                  style={{ width:'100%', padding:'10px', borderRadius:8, fontSize:12, fontWeight:600,
                    border:'1px solid rgba(75,232,216,0.3)', background:'rgba(75,232,216,0.08)',
                    color:'var(--cyan)', cursor: trigRunning ? 'not-allowed' : 'pointer',
                    opacity: trigRunning ? 0.6 : 1, transition:'all .2s' }}>
                  {trigRunning ? '⏳ Checking all products…' : '▶ Run Warranty Check Now'}
                </button>
              </div>

              {/* Stats */}
              <div className="card" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                <p className="label" style={{ marginBottom:14 }}>NOTIFICATION STATS</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { val: selectedDays.length, label:'Alert Windows',   color:'var(--gold)'    },
                    { val: '8:00 AM',            label:'Daily Scan',      color:'var(--cyan)'    },
                    { val: '1×',                 label:'Per Product/Day', color:'var(--success)' },
                    { val: '2',                  label:'Active Channels', color:'var(--violet)'  },
                  ].map(s => (
                    <div key={s.label} className="stat-ring-card">
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationPrefs;