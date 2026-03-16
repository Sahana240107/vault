import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const playfair = { fontFamily: 'Playfair Display, serif' };

  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh' }}>
      <div className="glow-orb" style={{ width:600,height:600,top:-200,left:-100,background:'rgba(232,184,75,1)' }}></div>
      <div className="glow-orb" style={{ width:400,height:400,bottom:0,right:-100,background:'rgba(139,110,245,1)' }}></div>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-grid-bg"></div>
        <div className="hero-orb-1"></div>
        <div className="hero-orb-2"></div>

        <p style={{ fontSize:11,letterSpacing:4,color:'var(--gold)',fontFamily:'Syne,sans-serif',fontWeight:600,marginBottom:20,position:'relative',zIndex:1 }}>
          DIGITAL PRODUCT OWNERSHIP VAULT
        </p>
        <h1 style={{ ...playfair, fontSize:'clamp(42px,8vw,88px)', fontWeight:900, lineHeight:1.0, letterSpacing:-2, marginBottom:24, position:'relative', zIndex:1 }}>
          Every Product<br />
          <span style={{ color:'var(--gold)' }}>You Own. Secured.</span>
        </h1>
        <p style={{ fontSize:17,color:'var(--text-secondary)',maxWidth:480,lineHeight:1.6,margin:'0 auto 36px',position:'relative',zIndex:1 }}>
          Store bills, track warranties, get AI-powered alerts — for you and your entire family vault.
        </p>
        <div style={{ display:'flex',gap:12,justifyContent:'center',position:'relative',zIndex:1 }}>
          <button className="btn-primary" onClick={() => navigate('/register')}>⚡ Get Started Free</button>
          <button className="btn-ghost" onClick={() => navigate('/login')}>Sign In →</button>
        </div>

        <div style={{ display:'flex',gap:10,marginTop:36,flexWrap:'wrap',justifyContent:'center',position:'relative',zIndex:1 }}>
          <span className="chip gold">🤖 AI Receipt Scanner</span>
          <span className="chip cyan">📍 Geo-Aware Alerts</span>
          <span className="chip violet">👨‍👩‍👧 Family Vault</span>
          <span className="chip green">🏆 Health Score</span>
        </div>

        <div style={{ position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',color:'var(--text-muted)',fontSize:11,letterSpacing:2 }}>▼ SCROLL</div>
      </section>

      {/* FEATURES */}
      <section style={{ padding:'80px 48px' }}>
        <div style={{ textAlign:'center' }}>
          <p className="label">WHY VAULTMERN</p>
          <h2 style={{ ...playfair, fontSize:'clamp(28px,4vw,52px)', fontWeight:800, lineHeight:1.05, letterSpacing:-1, marginTop:10 }}>
            Built for the way<br />you actually <span style={{ color:'var(--gold)' }}>own things.</span>
          </h2>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,marginTop:48 }}>
          {[
            { icon:'🤖', title:'AI Receipt Scanner', desc:'Point your camera at any bill. OCR extracts product name, price, purchase date & warranty automatically.' },
            { icon:'📍', title:'Geo-Aware Service Alerts', desc:'Push notification fires when you\'re physically near a brand service center AND your warranty is expiring.' },
            { icon:'🏆', title:'Vault Health Score', desc:'Gamified 0–100 score that rewards completeness. The more you document, the higher your score.' },
            { icon:'👨‍👩‍👧', title:'Collaborative Family Vault', desc:'Real-time sync via Socket.io. Invite family with Owner, Editor, or Viewer roles.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <span style={{ fontSize:32,marginBottom:14,display:'block' }}>{f.icon}</span>
              <h3 style={{ ...playfair, fontSize:18, fontWeight:700, marginBottom:8 }}>{f.title}</h3>
              <p style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AUTH SECTION */}
      <section style={{ padding:'60px 48px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center' }} id="auth-section">
        <div>
          <p className="label">START FOR FREE</p>
          <h2 style={{ ...playfair, fontSize:'clamp(28px,4vw,48px)', fontWeight:800, lineHeight:1.05, letterSpacing:-1, marginTop:10, marginBottom:16 }}>
            Your vault<br />awaits <span style={{ color:'var(--gold)' }}>you.</span>
          </h2>
          <p style={{ fontSize:14,color:'var(--text-muted)',lineHeight:1.7,maxWidth:360 }}>
            Join thousands of households securing their product ownership.
          </p>
          <div style={{ marginTop:24,display:'flex',flexDirection:'column',gap:10 }}>
            {['Free forever for personal use','Up to 5 family members','Cloud-synced, end-to-end encrypted'].map(t => (
              <div key={t} style={{ fontSize:13,color:'var(--text-secondary)' }}>✅ {t}</div>
            ))}
          </div>
        </div>
        <div className="auth-form-card">
          <h3 style={{ ...playfair, fontSize:24, fontWeight:800, marginBottom:6 }}>Create Your Vault</h3>
          <p style={{ fontSize:13,color:'var(--text-muted)',marginBottom:28 }}>Sign up and start protecting your products in minutes.</p>
          <button className="btn-primary" style={{ width:'100%',justifyContent:'center',marginBottom:16 }} onClick={() => navigate('/register')}>
            ⚡ Create Account
          </button>
          <div className="or-divider">OR</div>
          <p style={{ textAlign:'center',marginTop:16,fontSize:12,color:'var(--text-muted)' }}>
            Already have a vault? <span style={{ color:'var(--gold)',cursor:'pointer' }} onClick={() => navigate('/login')}>Sign in →</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Landing;