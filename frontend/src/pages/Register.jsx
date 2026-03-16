import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await api('/auth/register', 'POST', form);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh',background:'var(--void)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <div className="glow-orb" style={{ width:600,height:600,top:-200,left:-100,background:'rgba(232,184,75,1)' }}></div>
      <div className="glow-orb" style={{ width:400,height:400,bottom:0,right:-100,background:'rgba(139,110,245,1)' }}></div>

      <div className="auth-form-card" style={{ width:'100%',maxWidth:420,position:'relative',zIndex:1 }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:22,color:'var(--gold)',marginBottom:4 }}>VaultMERN</div>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,marginBottom:6 }}>Create Your Vault</h3>
          <p style={{ fontSize:13,color:'var(--text-muted)' }}>Start protecting your products today</p>
        </div>

        {error && (
          <div style={{ background:'rgba(245,75,75,0.1)',border:'1px solid rgba(245,75,75,0.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--danger)',marginBottom:16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-label">FULL NAME</div>
            <input className="input-field" type="text" placeholder="Arjun Sharma" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <div className="input-label">EMAIL ADDRESS</div>
            <input className="input-field" type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <div className="input-label">PASSWORD</div>
            <input className="input-field" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn-primary" type="submit" style={{ width:'100%',justifyContent:'center',marginTop:8 }} disabled={loading}>
            {loading ? 'Creating vault...' : '⚡ Create Account'}
          </button>
        </form>

        <p style={{ textAlign:'center',marginTop:20,fontSize:12,color:'var(--text-muted)' }}>
          Already have a vault? <span style={{ color:'var(--gold)',cursor:'pointer' }} onClick={() => navigate('/login')}>Sign in →</span>
        </p>
      </div>
    </div>
  );
};

export default Register;