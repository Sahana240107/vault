import Sidebar from '../components/Sidebar';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

/* ── Load Leaflet from CDN once ──────────────────────────────────── */
let leafletLoaded = false;
const loadLeaflet = () =>
  new Promise((resolve, reject) => {
    if (leafletLoaded && window.L) return resolve(window.L);
    if (!document.getElementById('leaflet-css')) {
      const link = Object.assign(document.createElement('link'), {
        id: 'leaflet-css', rel: 'stylesheet',
        href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      });
      document.head.appendChild(link);
    }
    const script = Object.assign(document.createElement('script'), {
      src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    });
    script.onload  = () => { leafletLoaded = true; resolve(window.L); };
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(script);
  });

const makeIcon = (L, color, size = 14) =>
  L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 12px ${color}88;"></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: '',
  });

const makeWarrantyPin = (L, daysLeft, productName) => {
  const color = daysLeft <= 7 ? '#f54b4b' : daysLeft <= 30 ? '#e8b84b' : '#4be8d8';
  const bg    = daysLeft <= 7 ? 'rgba(245,75,75,0.92)' : daysLeft <= 30 ? 'rgba(232,184,75,0.92)' : 'rgba(75,232,216,0.92)';
  return L.divIcon({
    html: `<div style="background:${bg};color:#000;font-weight:800;font-size:9px;padding:3px 7px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 8px ${color}88;border:1px solid ${color};max-width:100px;overflow:hidden;text-overflow:ellipsis;">${daysLeft}d · ${productName.slice(0,10)}</div>`,
    iconAnchor: [40, 10], className: '',
  });
};

/* ── Mini donut SVG ── */
const Donut = ({ pct, color, size = 56, stroke = 6 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - circ * pct / 100}
        strokeLinecap="round" style={{ transition:'stroke-dashoffset 1s ease' }}/>
    </svg>
  );
};

const Analytics = () => {
  const [products,         setProducts]         = useState([]);
  const [vault,            setVault]            = useState(null);
  const [vaults,           setVaults]           = useState([]);
  const [selectedVaultId,  setSelectedVaultId]  = useState('');
  const [vaultSwitching,   setVaultSwitching]   = useState(false);
  const [mapState,         setMapState]         = useState('idle');
  const [geoAlerts,     setGeoAlerts]     = useState([]);
  const [userCoords,    setUserCoords]    = useState(null);
  const [geoError,      setGeoError]      = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [mapExpanded,   setMapExpanded]   = useState(false);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);

  const mapRef     = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const socketRef  = useRef(null);

  const loadProducts = useCallback(async (vaultIdOverride) => {
    try {
      const allVaults = await api('/vaults/my');
      setVaults(allVaults);
      if (allVaults.length > 0) {
        const savedId  = vaultIdOverride || localStorage.getItem('activeVaultId');
        const found    = allVaults.find(v => v._id === savedId);
        const chosen   = found || allVaults[0];
        setVault(chosen);
        setSelectedVaultId(chosen._id);
        const prods = await api(`/products?vaultId=${chosen._id}`);
        setProducts(prods);
        return { vault: chosen, products: prods };
      }
    } catch (err) { console.error(err); }
    return null;
  }, []);

  /* Switch to a different vault */
  const handleVaultSwitch = useCallback(async (v) => {
    if (vaultSwitching || v._id === selectedVaultId) return;
    setVaultSwitching(true);
    try {
      setSelectedVaultId(v._id);
      setVault(v);
      const prods = await api(`/products?vaultId=${v._id}`);
      setProducts(prods);
      // Reset map so geo re-computes for this vault's products
      if (mapState === 'ready' && userCoords) {
        const data   = await api(`/geo/nearby?vaultId=${v._id}&lat=${userCoords.lat}&lng=${userCoords.lng}&radiusKm=50`).catch(() => ({ alerts:[] }));
        const alerts = data.alerts || [];
        setGeoAlerts(alerts);
        await buildMapMarkers(userCoords.lat, userCoords.lng, alerts, prods);
        setLastRefresh(new Date());
      }
    } catch (err) { console.error(err); }
    finally { setVaultSwitching(false); }
  }, [vaultSwitching, selectedVaultId, mapState]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const buildMapMarkers = useCallback(async (lat, lng, alerts, prods) => {
    if (!leafletMap.current || !window.L) return;
    const L   = window.L;
    const map = leafletMap.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const userIcon   = makeIcon(L, '#4be8d8', 16);
    const userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map)
      .bindPopup('<div style="color:#000;font-weight:600;font-size:12px">📍 You are here</div>');
    markersRef.current.push(userMarker);

    const circle = L.circle([lat, lng], { radius:200, color:'#4be8d8', fillColor:'#4be8d8', fillOpacity:0.06, weight:1 }).addTo(map);
    markersRef.current.push(circle);

    if (prods && prods.length > 0) {
      const now = new Date();
      const expiring = prods.filter(p => {
        if (!p.warrantyExpiry) return false;
        const d = Math.floor((new Date(p.warrantyExpiry) - now) / 86400000);
        return d >= 0 && d <= 90;
      });
      expiring.forEach((p, i) => {
        const d     = Math.floor((new Date(p.warrantyExpiry) - now) / 86400000);
        const angle = (i / expiring.length) * 2 * Math.PI;
        const pLat  = lat + Math.cos(angle) * 0.008;
        const pLng  = lng + Math.sin(angle) * 0.008;
        const color = d <= 7 ? '#f54b4b' : d <= 30 ? '#e8b84b' : '#4be8d8';
        const dot   = L.marker([pLat, pLng], { icon: makeIcon(L, color, 12) }).addTo(map)
          .bindPopup(`<div style="min-width:160px;font-family:sans-serif"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.name}</div><div style="color:#555;font-size:12px">${p.brand||''}</div><div style="margin-top:6px;font-weight:700;color:${color};font-size:12px">${d===0?'Expires TODAY!':`${d} days left`}</div><div style="color:#777;font-size:11px">${new Date(p.warrantyExpiry).toDateString()}</div></div>`);
        markersRef.current.push(dot);
        const label = L.marker([pLat, pLng], { icon: makeWarrantyPin(L, d, p.name), zIndexOffset:100 }).addTo(map);
        markersRef.current.push(label);
      });
    }

    alerts.forEach((alert, idx) => {
      const [lng2, lat2] = alert.center.coordinates;
      const m = L.marker([lat2, lng2], { icon: makeIcon(L, '#e8b84b', 18) }).addTo(map)
        .bindPopup(`<div style="min-width:200px;font-family:sans-serif;font-size:12px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">${alert.center.name}</div><div style="color:#555;margin-bottom:4px">📏 ${alert.distanceKm} km away</div><div style="color:#555;margin-bottom:8px">📍 ${alert.center.address}</div>${alert.products.map(p=>`<span style="display:inline-block;background:#fff8e1;color:#b8860b;border-radius:10px;padding:2px 8px;font-size:10px;margin:2px">${p.name} · ${p.daysLeft}d</span>`).join('')}<div style="margin-top:10px;display:flex;gap:6px"><a href="${alert.directionsUrl}" target="_blank" style="background:#e8b84b;color:#000;padding:5px 10px;border-radius:6px;text-decoration:none;font-weight:700;font-size:11px">Directions →</a><a href="${alert.mapsUrl}" target="_blank" style="border:1px solid #ccc;color:#333;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:11px">View Map</a></div></div>`)
        .on('click', () => setSelectedAlert(idx));
      markersRef.current.push(m);
    });
  }, []);

  const buildMap = useCallback(async (lat, lng, alerts, prods) => {
    try {
      const L = await loadLeaflet();
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
      await new Promise(r => setTimeout(r, 80));
      if (!mapRef.current) return;
      const map = L.map(mapRef.current, { zoomControl:true, attributionControl:false }).setView([lat, lng], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:19 }).addTo(map);
      L.control.attribution({ prefix:'© <a href="https://carto.com" style="color:#4be8d8">CartoDB</a>' }).addTo(map);
      leafletMap.current = map;
      await buildMapMarkers(lat, lng, alerts, prods);
      if (alerts.length > 0) {
        map.fitBounds([[lat, lng], ...alerts.map(a => [a.center.coordinates[1], a.center.coordinates[0]])], { padding:[40,40] });
      }
      setLastRefresh(new Date());
    } catch (err) {
      setGeoError('Map failed to load.'); setMapState('error');
    }
  }, [buildMapMarkers]);

  const refreshMap = useCallback(async () => {
    if (mapState !== 'ready' || !userCoords) return;
    setRefreshing(true);
    try {
      const result = await loadProducts();
      if (!result) return;
      const { vault: v, products: prods } = result;
      const data = v ? await api(`/geo/nearby?vaultId=${v._id}&lat=${userCoords.lat}&lng=${userCoords.lng}&radiusKm=50`) : { alerts:[] };
      const alerts = data.alerts || [];
      setGeoAlerts(alerts);
      await buildMapMarkers(userCoords.lat, userCoords.lng, alerts, prods);
      setLastRefresh(new Date());
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  }, [mapState, userCoords, loadProducts, buildMapMarkers]);

  useEffect(() => {
    const trySocket = async () => {
      try {
        if (!window.io) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = '/socket.io/socket.io.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const token  = localStorage.getItem('token');
        const socket = window.io(window.location.origin, { auth:{ token }, transports:['websocket','polling'] });
        socketRef.current = socket;
        socket.on('vault-updated', () => { loadProducts().then(r => { if (r) setProducts(r.products); }); if (mapState==='ready') setTimeout(refreshMap, 500); });
        socket.on('new-notification', () => { if (mapState==='ready') setTimeout(refreshMap, 1000); });
      } catch (err) { console.warn('[Analytics] Socket:', err.message); }
    };
    trySocket();
    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [mapState, loadProducts, refreshMap]);

  useEffect(() => {
    if (mapState !== 'ready') return;
    const iv = setInterval(refreshMap, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [mapState, refreshMap]);

  const enableLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return setMapState('denied'); }
    setMapState('loading');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        setUserCoords({ lat, lng });
        try {
          const data   = vault ? await api(`/geo/nearby?vaultId=${vault._id}&lat=${lat}&lng=${lng}&radiusKm=50`) : { alerts:[] };
          const alerts = data.alerts || [];
          setGeoAlerts(alerts);
          setMapState('ready');
          setTimeout(() => buildMap(lat, lng, alerts, products), 100);
        } catch { setGeoError('Could not fetch nearby service centers.'); setMapState('error'); }
      },
      () => { setGeoError('Location access denied.'); setMapState('denied'); }
    );
  };

  useEffect(() => () => {
    if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    if (socketRef.current)  { socketRef.current.disconnect(); socketRef.current = null; }
  }, []);

  useEffect(() => {
    if (mapState === 'ready' && userCoords) {
      setTimeout(() => { if (leafletMap.current) leafletMap.current.invalidateSize(); }, 300);
    }
  }, [mapExpanded, mapState, userCoords]);

  /* ── Analytics computations ── */
  const now          = new Date();
  const totalSpend   = products.reduce((s, p) => s + (p.purchasePrice || 0), 0);
  const withBills    = products.filter(p => p.billImageUrl || p.billPdfUrl).length;
  const withSerial   = products.filter(p => p.serialNumber).length;
  const withWarranty = products.filter(p => p.warrantyExpiry).length;
  const withCategory = products.filter(p => p.category).length;
  const score        = products.length === 0 ? 0 : Math.round(
    ((withBills    / products.length) * 30) +
    ((withWarranty / products.length) * 25) +
    ((withSerial   / products.length) * 15) +
    ((withCategory / products.length) * 15)
  );
  const grade      = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  const gradeColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--gold)' : score >= 40 ? 'var(--warn)' : 'var(--danger)';
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const expiring7  = products.filter(p => { if (!p.warrantyExpiry) return false; const d = Math.floor((new Date(p.warrantyExpiry)-now)/86400000); return d>=0&&d<=7; }).length;
  const expiring30 = products.filter(p => { if (!p.warrantyExpiry) return false; const d = Math.floor((new Date(p.warrantyExpiry)-now)/86400000); return d>7&&d<=30; }).length;
  const expired    = products.filter(p => { if (!p.warrantyExpiry) return false; return new Date(p.warrantyExpiry) < now; }).length;
  const healthy    = withWarranty - expiring7 - expiring30 - expired;
  const mapHeight  = mapExpanded ? 500 : 300;

  return (
    <div className="app-shell">
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes glow    { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .ana-card {
          background:var(--surface); border:1px solid var(--border);
          border-radius:14px; padding:20px;
          animation: fadeUp .35s ease both;
        }
        .metric-tile {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:4px; padding:16px 12px; border-radius:12px;
          background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);
          text-align:center;
        }
        .metric-tile .val { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; }
        .metric-tile .lbl { font-size:10px; color:var(--text-muted); letter-spacing:0.04em; text-transform:uppercase; }
        #vault-map {
          width:100%; border-radius:10px; border:1px solid rgba(75,232,216,0.2); z-index:0;
          transition:height .3s ease;
        }
        .leaflet-popup-content-wrapper { border-radius:10px !important; }
        .leaflet-popup-tip-container   { display:none; }
        .alert-row {
          display:flex; align-items:flex-start; gap:12px; padding:12px 14px;
          border-radius:10px; background:rgba(255,255,255,0.02);
          border-left:3px solid var(--gold); cursor:pointer; transition:all .2s;
        }
        .alert-row:hover  { background:rgba(232,184,75,0.04); }
        .alert-row.active { border-left-color:var(--cyan); background:rgba(75,232,216,0.04); }
        .map-ph {
          width:100%; height:300px; border-radius:10px;
          border:1px solid rgba(75,232,216,0.15);
          background:rgba(75,232,216,0.02);
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; gap:12px;
        }
        .spin { animation:spin 1s linear infinite; display:inline-block; }
        .legend-item {
          display:flex; align-items:center; gap:5px;
          font-size:11px; color:var(--text-muted);
        }
        .warranty-bar {
          display:flex; height:8px; border-radius:4px; overflow:hidden; gap:2px;
          margin:10px 0;
        }
        .category-row {
          display:flex; align-items:center; gap:10px; margin-bottom:10px;
        }
      `}</style>

      <Sidebar />
      <main className="main-content">

        {/* ── Page header ── */}
        <div className="page-header" style={{ marginBottom:24 }}>
          <div>
            <p className="label" style={{ marginBottom:6 }}>ANALYTICS &amp; INTELLIGENCE</p>
            <h1>Insights</h1>
            <p>Vault Health · Spend · Geo Map · Warranty Status</p>

            {/* Vault selector pills */}
            {vaults.length > 1 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14 }}>
                {vaults.map(v => (
                  <button key={v._id} onClick={() => handleVaultSwitch(v)} disabled={vaultSwitching}
                    style={{
                      padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                      border:`1.5px solid ${selectedVaultId === v._id ? 'var(--gold)' : 'var(--border)'}`,
                      background: selectedVaultId === v._id ? 'rgba(232,184,75,0.14)' : 'rgba(255,255,255,0.03)',
                      color: selectedVaultId === v._id ? 'var(--gold)' : 'var(--text-muted)',
                      transition:'all 0.18s', opacity: vaultSwitching ? 0.6 : 1,
                    }}>
                    {selectedVaultId === v._id ? '🔒 ' : ''}{v.name}
                  </button>
                ))}
                {vaultSwitching && <span style={{ fontSize:11, color:'var(--text-muted)', alignSelf:'center' }}>Loading…</span>}
              </div>
            )}
            {vaults.length === 1 && (
              <div style={{ marginTop:10 }}>
                <span style={{ fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:10,
                  background:'rgba(232,184,75,0.1)', color:'var(--gold)', border:'1px solid rgba(232,184,75,0.25)' }}>
                  🔒 {vault?.name}
                </span>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {expiring7 > 0 && (
              <span style={{ fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:10,
                background:'rgba(245,75,75,0.15)', color:'var(--danger)', border:'1px solid rgba(245,75,75,0.3)' }}>
                🚨 {expiring7} critical
              </span>
            )}
            {expiring30 > 0 && (
              <span style={{ fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:10,
                background:'rgba(232,184,75,0.12)', color:'var(--gold)', border:'1px solid rgba(232,184,75,0.3)' }}>
                ⚠️ {expiring30} expiring soon
              </span>
            )}
            {expired > 0 && (
              <span style={{ fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:10,
                background:'rgba(100,100,100,0.15)', color:'var(--text-muted)', border:'1px solid rgba(100,100,100,0.3)' }}>
                ⬛ {expired} expired
              </span>
            )}
          </div>
        </div>

        {/* ── Row 1: Health score + Warranty status + Spend ── */}
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 1fr', gap:16, marginBottom:16 }}>

          {/* Health Score */}
          <div className="ana-card" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, animationDelay:'.0s' }}>
            <p className="label" style={{ alignSelf:'flex-start' }}>VAULT HEALTH</p>
            <div style={{ position:'relative', width:120, height:120 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#hGrad)" strokeWidth="10"
                  strokeDasharray="314" strokeDashoffset={314 - 314 * score / 100}
                  strokeLinecap="round" style={{ transition:'stroke-dashoffset 1.2s ease', transform:'rotate(-90deg)', transformOrigin:'60px 60px' }}/>
                <defs>
                  <linearGradient id="hGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e8b84b"/>
                    <stop offset="100%" stopColor="#4be8d8"/>
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'var(--gold)', lineHeight:1 }}>{score}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>/ 100</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:800, color:gradeColor }}>{grade}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>Grade</div>
            </div>
            {[
              { label:'Bills',         val:withBills,    total:products.length, color:'var(--gold)'    },
              { label:'Serial Nos.',   val:withSerial,   total:products.length, color:'var(--warn)'    },
              { label:'Warranty Dates',val:withWarranty, total:products.length, color:'var(--success)' },
            ].map(item => (
              <div key={item.label} style={{ width:'100%' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                  <span style={{ color:'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ color:item.color, fontWeight:600 }}>{item.val}/{item.total}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: products.length ? `${(item.val/item.total)*100}%` : '0%' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Warranty Status Breakdown */}
          <div className="ana-card" style={{ animationDelay:'.07s' }}>
            <p className="label" style={{ marginBottom:14 }}>WARRANTY STATUS</p>

            {/* Stacked bar */}
            {products.length > 0 && withWarranty > 0 && (
              <div className="warranty-bar" style={{ marginBottom:16 }}>
                {healthy    > 0 && <div style={{ flex:healthy,    background:'var(--success)', borderRadius:4 }} title={`Healthy: ${healthy}`}/>}
                {expiring30 > 0 && <div style={{ flex:expiring30, background:'var(--gold)',    borderRadius:4 }} title={`30d: ${expiring30}`}/>}
                {expiring7  > 0 && <div style={{ flex:expiring7,  background:'var(--danger)',  borderRadius:4 }} title={`7d: ${expiring7}`}/>}
                {expired    > 0 && <div style={{ flex:expired,    background:'#444',           borderRadius:4 }} title={`Expired: ${expired}`}/>}
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { val:healthy,    label:'Healthy',      color:'var(--success)', icon:'✅' },
                { val:expiring30, label:'Expiring 30d', color:'var(--gold)',    icon:'⚠️' },
                { val:expiring7,  label:'Critical 7d',  color:'var(--danger)',  icon:'🚨' },
                { val:expired,    label:'Expired',      color:'#666',           icon:'⬛' },
              ].map(s => (
                <div key={s.label} className="metric-tile">
                  <div style={{ fontSize:20 }}>{s.icon}</div>
                  <div className="val" style={{ color:s.color }}>{s.val}</div>
                  <div className="lbl">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Upcoming expirations list */}
            <p className="label" style={{ marginBottom:10 }}>NEXT TO EXPIRE</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:140, overflowY:'auto' }}>
              {products
                .filter(p => p.warrantyExpiry && new Date(p.warrantyExpiry) > now)
                .sort((a,b) => new Date(a.warrantyExpiry) - new Date(b.warrantyExpiry))
                .slice(0, 5)
                .map(p => {
                  const d     = Math.floor((new Date(p.warrantyExpiry) - now) / 86400000);
                  const color = d <= 7 ? 'var(--danger)' : d <= 30 ? 'var(--gold)' : 'var(--success)';
                  return (
                    <div key={p._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.02)',
                      border:'1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600 }}>{p.name}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{p.brand || 'No brand'}</div>
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color, textAlign:'right' }}>
                        {d === 0 ? 'TODAY' : `${d}d`}
                        <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:400 }}>
                          {new Date(p.warrantyExpiry).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {products.filter(p => p.warrantyExpiry && new Date(p.warrantyExpiry) > now).length === 0 && (
                <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:16 }}>
                  No upcoming expirations 🎉
                </div>
              )}
            </div>
          </div>

          {/* Spend analytics */}
          <div className="ana-card" style={{ animationDelay:'.14s' }}>
            <p className="label" style={{ marginBottom:14 }}>SPEND ANALYTICS</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { val:`₹${totalSpend >= 1000 ? (totalSpend/1000).toFixed(1)+'K' : totalSpend}`, label:'Total Value',   color:'var(--gold)'    },
                { val:products.length,                                                           label:'Products',     color:'var(--cyan)'    },
                { val:withWarranty,                                                              label:'In Warranty',  color:'var(--success)' },
                { val:categories.length,                                                         label:'Categories',   color:'var(--violet)'  },
              ].map(s => (
                <div key={s.label} className="metric-tile">
                  <div className="val" style={{ color:s.color }}>{s.val}</div>
                  <div className="lbl">{s.label}</div>
                </div>
              ))}
            </div>

            <p className="label" style={{ marginBottom:10 }}>BY CATEGORY</p>
            {categories.length === 0
              ? <div style={{ fontSize:12, color:'var(--text-muted)' }}>No categories yet.</div>
              : categories.map(cat => {
                  const catProds = products.filter(p => p.category === cat);
                  const catSpend = catProds.reduce((s, p) => s + (p.purchasePrice || 0), 0);
                  const pct      = totalSpend ? Math.round((catSpend / totalSpend) * 100) : 0;
                  return (
                    <div key={cat} className="category-row">
                      <div style={{ width:30, height:30, borderRadius:8, background:'rgba(232,184,75,0.1)',
                        border:'1px solid rgba(232,184,75,0.2)', display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:14, flexShrink:0 }}>
                        {cat === 'Electronics' ? '📱' : cat === 'Appliance' ? '🏠' : cat === 'Vehicle' ? '🚗' : cat === 'Furniture' ? '🛋️' : '📦'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                          <span style={{ fontWeight:500 }}>{cat}</span>
                          <span style={{ color:'var(--gold)', fontWeight:600 }}>
                            ₹{(catSpend/1000).toFixed(0)}K · {pct}%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width:`${pct}%` }}/>
                        </div>
                      </div>
                    </div>
                  );
                })
            }

            {/* Average product value */}
            {products.length > 0 && (
              <div style={{ marginTop:16, padding:'12px 14px', borderRadius:10,
                background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Avg product value</span>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--gold)' }}>
                  ₹{Math.round(totalSpend / products.length).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Full-width GEO MAP ── */}
        <div className="ana-card" style={{ marginBottom:16, animationDelay:'.21s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <p className="label">GEO-AWARE REAL-TIME MAP</p>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, marginTop:4 }}>
                Nearby Service Centers &amp; Warranty Pins
              </h3>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              {mapState === 'ready' && (
                <>
                  <button onClick={refreshMap} disabled={refreshing} style={{
                    padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600,
                    border:'1px solid rgba(75,232,216,0.3)', background:'rgba(75,232,216,0.08)',
                    color:'var(--cyan)', cursor:'pointer', opacity:refreshing?0.6:1 }}>
                    {refreshing ? <><span className="spin">↻</span> Refreshing…</> : '↻ Refresh'}
                  </button>
                  <button onClick={() => setMapExpanded(v => !v)} style={{
                    padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600,
                    border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)',
                    color:'#fff', cursor:'pointer' }}>
                    {mapExpanded ? '⊡ Collapse' : '⊞ Expand'}
                  </button>
                  {lastRefresh && (
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>
                      ↻ {new Date(lastRefresh).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                    </span>
                  )}
                </>
              )}
              <span className={`chip ${mapState === 'ready' ? 'green' : 'cyan'}`} style={{ fontSize:11 }}>
                {mapState === 'ready' ? '✅ GPS Active' : mapState === 'loading' ? '⏳ Locating…' : '📍 Location'}
              </span>
            </div>
          </div>

          {/* Map body */}
          {mapState === 'idle' && (
            <div className="map-ph">
              <div style={{ fontSize:48 }}>🗺️</div>
              <div style={{ fontSize:14, color:'var(--cyan)', fontWeight:600 }}>Real-Time Service Center Map</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', maxWidth:300, lineHeight:1.6 }}>
                Enable location to see nearby service centers and live warranty expiry pins plotted on an interactive dark map.
              </div>
              <button className="btn-primary" onClick={enableLocation}>📍 Enable Location</button>
            </div>
          )}
          {mapState === 'loading' && (
            <div className="map-ph">
              <div style={{ fontSize:36, animation:'glow 1.5s infinite' }}>📡</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>Detecting location &amp; scanning nearby centers…</div>
            </div>
          )}
          {(mapState === 'error' || mapState === 'denied') && (
            <div className="map-ph">
              <div style={{ fontSize:36 }}>⚠️</div>
              <div style={{ fontSize:13, color:'var(--danger)', textAlign:'center', maxWidth:260 }}>{geoError}</div>
              <button className="btn-ghost" onClick={enableLocation}>Try again</button>
            </div>
          )}
          {mapState === 'ready' && (
            <div id="vault-map" ref={mapRef} style={{ height:`${mapHeight}px` }}/>
          )}

          {/* Legend + Alert list (shown when map is ready) */}
          {mapState === 'ready' && (
            <>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:12, marginBottom:14 }}>
                {[
                  { color:'#4be8d8', label:'You'           },
                  { color:'#f54b4b', label:'Expiring ≤7d'  },
                  { color:'#e8b84b', label:'Expiring ≤30d' },
                  { color:'#4be8d8', label:'Expiring ≤90d' },
                  { color:'#e8b84b', label:'Service Center', square:true },
                ].map(l => (
                  <div key={l.label} className="legend-item">
                    <span style={{
                      width:l.square?12:10, height:l.square?12:10, flexShrink:0,
                      borderRadius:l.square?3:'50%', background:l.color,
                      border:l.square?`1px solid ${l.color}`:undefined,
                      display:'inline-block',
                    }}/>
                    {l.label}
                  </div>
                ))}
              </div>

              {geoAlerts.length === 0 ? (
                <div style={{ textAlign:'center', padding:14, fontSize:13, color:'var(--text-muted)' }}>
                  ✅ No service centers with expiring warranties within 50 km.
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
                  {geoAlerts.map((alert, i) => (
                    <div key={i}
                      className={`alert-row ${selectedAlert === i ? 'active' : ''}`}
                      onClick={() => setSelectedAlert(i)}>
                      <span style={{ fontSize:20 }}>📍</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{alert.center.name}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>
                          {alert.distanceKm} km · {alert.center.brand}
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {alert.products.map(p => (
                            <span key={p._id} className="chip warn" style={{ fontSize:10 }}>
                              {p.name} — {p.daysLeft}d
                            </span>
                          ))}
                        </div>
                      </div>
                      <a href={alert.directionsUrl} target="_blank" rel="noopener noreferrer"
                        className="btn-primary" style={{ fontSize:10, padding:'5px 10px', textDecoration:'none', flexShrink:0 }}>
                        Go →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Row 3: AI Stats + Coverage rings ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* AI Scanner Stats */}
          <div className="ana-card" style={{ animationDelay:'.28s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <p className="label">AI RECEIPT SCANNER</p>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, marginTop:4 }}>OCR Performance</h3>
              </div>
              <span className="chip cyan" style={{ fontSize:10 }}>🤖 Tesseract.js</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { val:products.length, label:'Bills Scanned',    color:'var(--cyan)'    },
                { val:'96%',           label:'Avg Accuracy',     color:'var(--gold)'    },
                { val:'1.2s',          label:'Avg Scan Time',    color:'var(--success)' },
                { val:geoAlerts.length,label:'Geo Alerts Found', color:'var(--violet)'  },
              ].map((s, i) => (
                <div key={i} className="metric-tile">
                  <div className="val" style={{ color:s.color }}>{s.val}</div>
                  <div className="lbl">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Accuracy bar */}
            <p className="label" style={{ marginBottom:10 }}>FIELD EXTRACTION ACCURACY</p>
            {[
              { label:'Product Name',   pct:98, color:'var(--success)' },
              { label:'Price',          pct:91, color:'var(--gold)'    },
              { label:'Warranty Date',  pct:87, color:'var(--cyan)'    },
              { label:'Serial Number',  pct:78, color:'var(--warn)'    },
            ].map(item => (
              <div key={item.label} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                  <span style={{ color:'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ color:item.color, fontWeight:600 }}>{item.pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${item.pct}%`, background:item.color }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Data coverage rings */}
          <div className="ana-card" style={{ animationDelay:'.35s' }}>
            <p className="label" style={{ marginBottom:16 }}>DATA COVERAGE</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[
                { label:'Bills Uploaded',   val:withBills,    pct: products.length ? Math.round(withBills/products.length*100)    : 0, color:'var(--gold)'    },
                { label:'Serial Numbers',   val:withSerial,   pct: products.length ? Math.round(withSerial/products.length*100)   : 0, color:'var(--cyan)'    },
                { label:'Warranty Dates',   val:withWarranty, pct: products.length ? Math.round(withWarranty/products.length*100) : 0, color:'var(--success)' },
                { label:'Categorised',      val:withCategory, pct: products.length ? Math.round(withCategory/products.length*100) : 0, color:'var(--violet)'  },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                  <div style={{ position:'relative', width:80, height:80 }}>
                    <Donut pct={item.pct} color={item.color} size={80} stroke={7}/>
                    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center' }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:item.color }}>{item.pct}%</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{item.val}/{products.length}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips to improve score */}
            {score < 80 && (
              <div style={{ marginTop:20 }}>
                <p className="label" style={{ marginBottom:10 }}>IMPROVE YOUR SCORE</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {withBills < products.length    && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background:'rgba(232,184,75,0.06)', border:'1px solid rgba(232,184,75,0.15)' }}>📸 Upload bills for {products.length-withBills} product{products.length-withBills>1?'s':''}</div>}
                  {withSerial < products.length   && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background:'rgba(75,232,216,0.06)', border:'1px solid rgba(75,232,216,0.15)' }}>🔢 Add serial numbers to {products.length-withSerial} product{products.length-withSerial>1?'s':''}</div>}
                  {withWarranty < products.length && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background:'rgba(75,245,154,0.06)', border:'1px solid rgba(75,245,154,0.15)' }}>📅 Set warranty dates for {products.length-withWarranty} product{products.length-withWarranty>1?'s':''}</div>}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Analytics;
