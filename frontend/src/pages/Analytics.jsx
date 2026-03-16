import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Analytics = () => {
  const [products, setProducts] = useState([]);
  const [vault, setVault] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const vaults = await api('/vaults/my');
        if (vaults.length > 0) {
          setVault(vaults[0]);
          const prods = await api(`/products?vaultId=${vaults[0]._id}`);
          setProducts(prods);
        }
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  const totalSpend = products.reduce((s,p) => s + (p.purchasePrice||0), 0);
  const withBills = products.filter(p => p.billImageUrl || p.billPdfUrl).length;
  const withSerial = products.filter(p => p.serialNumber).length;
  const withWarranty = products.filter(p => p.warrantyExpiry).length;
  const score = products.length === 0 ? 0 : Math.round(
    ((withBills/products.length)*30) +
    ((withWarranty/products.length)*25) +
    ((withSerial/products.length)*15) +
    ((products.filter(p=>p.category).length/products.length)*15)
  );

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="label" style={{ marginBottom:6 }}>ANALYTICS & NOVEL FEATURES</p>
            <h1>Insights & Intelligence</h1>
            <p>Vault Health Score · Spend Analysis · AI Scanner Stats</p>
          </div>
        </div>

        {/* VAULT HEALTH SCORE */}
        <div className="card-glint" style={{ marginBottom:20,borderColor:'rgba(232,184,75,0.3)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:32,flexWrap:'wrap' }}>
            <div className="health-ring">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#goldGrad)" strokeWidth="8"
                  strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * score / 100)} strokeLinecap="round"/>
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e8b84b"/>
                    <stop offset="100%" stopColor="#4be8d8"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="health-ring-label">
                <div className="health-ring-value">{score}</div>
                <div className="health-ring-sub">/ 100</div>
              </div>
            </div>
            <div style={{ flex:1,minWidth:200 }}>
              <div style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,marginBottom:4 }}>
                Vault Health Score <span className="chip gold" style={{ fontSize:12 }}>{score >= 80 ? 'A' : score >= 60 ? 'B' : 'C'}</span>
              </div>
              <p style={{ fontSize:13,color:'var(--text-muted)',marginBottom:16 }}>Add serial numbers and bills to improve your score.</p>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {[
                  { label:'Bills uploaded', val:withBills, total:products.length, color:'var(--gold)' },
                  { label:'Serial numbers', val:withSerial, total:products.length, color:'var(--warn)' },
                  { label:'Warranty dates set', val:withWarranty, total:products.length, color:'var(--success)' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4 }}>
                      <span style={{ color:'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ color:item.color }}>{item.val}/{item.total}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: products.length ? `${(item.val/item.total)*100}%` : '0%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SPEND + GEO */}
        <div className="grid-2" style={{ marginBottom:20 }}>
          <div className="card-glint">
            <p className="label" style={{ marginBottom:14 }}>SPEND ANALYTICS</p>
            <div style={{ display:'flex',gap:12,marginBottom:16 }}>
              <div style={{ flex:1,textAlign:'center',padding:14,background:'var(--deep)',borderRadius:10,border:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:'var(--gold)' }}>₹{(totalSpend/1000).toFixed(0)}K</div>
                <div style={{ fontSize:10,color:'var(--text-muted)' }}>Total Value</div>
              </div>
              <div style={{ flex:1,textAlign:'center',padding:14,background:'var(--deep)',borderRadius:10,border:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:'var(--cyan)' }}>{products.length}</div>
                <div style={{ fontSize:10,color:'var(--text-muted)' }}>Products</div>
              </div>
            </div>
            <p style={{ fontSize:11,color:'var(--text-muted)',marginBottom:10,letterSpacing:1 }}>CATEGORY BREAKDOWN</p>
            {categories.map(cat => {
              const catProds = products.filter(p => p.category === cat);
              const catSpend = catProds.reduce((s,p) => s + (p.purchasePrice||0), 0);
              const pct = totalSpend ? Math.round((catSpend/totalSpend)*100) : 0;
              return (
                <div key={cat} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4 }}>
                    <span>{cat}</span>
                    <span style={{ color:'var(--gold)' }}>₹{(catSpend/1000).toFixed(0)}K ({pct}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card-glint">
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
              <div>
                <p className="label">GEO-AWARE ALERTS</p>
                <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginTop:4 }}>Nearby Service Centers</h3>
              </div>
              <span className="chip cyan">📍 GPS On</span>
            </div>
            <div className="map-stub">
              <div style={{ position:'relative',zIndex:1,textAlign:'center' }}>
                <div style={{ fontSize:32,marginBottom:6 }}>🗺️</div>
                <div style={{ fontSize:12,color:'var(--cyan)' }}>Google Maps Integration</div>
                <div style={{ fontSize:10,color:'var(--text-muted)' }}>Service centers pinned near your location</div>
              </div>
            </div>
            <div style={{ marginTop:12,display:'flex',flexDirection:'column',gap:8 }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,fontSize:12,padding:10,background:'var(--deep)',borderRadius:8,borderLeft:'3px solid var(--cyan)' }}>
                <span>📍</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>Samsung Service Center</div>
                  <div style={{ color:'var(--text-muted)' }}>0.8 km away</div>
                </div>
                <button className="btn-ghost" style={{ fontSize:10,padding:'5px 8px' }}>Navigate</button>
              </div>
            </div>
          </div>
        </div>

        {/* AI STATS */}
        <div className="card-glint">
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10 }}>
            <div>
              <p className="label">AI RECEIPT SCANNER STATS</p>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginTop:4 }}>OCR Performance</h3>
            </div>
            <span className="chip cyan">🤖 Powered by Tesseract.js</span>
          </div>
          <div className="grid-4">
            {[
              { val:products.length, label:'Bills Scanned', color:'var(--cyan)' },
              { val:'96%', label:'Avg Accuracy', color:'var(--gold)' },
              { val:'1.2s', label:'Avg Scan Time', color:'var(--success)' },
              { val:0, label:'Manual Overrides', color:'var(--violet)' },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:'center',padding:16,background:'var(--deep)',borderRadius:10,border:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:s.color }}>{s.val}</div>
                <div style={{ fontSize:11,color:'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;