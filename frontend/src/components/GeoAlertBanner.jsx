import { useState } from 'react';
import { api } from '../services/api';

const GeoAlertBanner = ({ vaultId, products }) => {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [alerts, setAlerts] = useState([]);
  const [geoError, setGeoError] = useState('');

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setState('error');
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { lat, lng } = { lat: coords.latitude, lng: coords.longitude };
          const data = await api(`/geo/nearby?vaultId=${vaultId}&lat=${lat}&lng=${lng}&radiusKm=50`);
          setAlerts(data.alerts || []);
          setState('done');
        } catch (err) {
          setGeoError('Could not fetch nearby service centers.');
          setState('error');
        }
      },
      () => {
        setGeoError('Location access denied. Enable it in your browser to see nearby service alerts.');
        setState('error');
      }
    );
  };

  if (state === 'idle') {
    return (
      <div className="card" style={{ marginTop:16, borderColor:'var(--cyan)', background:'var(--cyan-dim)', display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:22 }}>📍</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--cyan)', marginBottom:2 }}>Geo-Aware Service Alerts</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Allow location to find service centers near you for expiring warranties</div>
        </div>
        <button className="btn-ghost" style={{ fontSize:12, padding:'8px 14px', borderColor:'var(--cyan)', color:'var(--cyan)' }} onClick={requestLocation}>
          Enable
        </button>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="card" style={{ marginTop:16, fontSize:13, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:10 }}>
        <span>📍</span> Detecting your location and scanning nearby service centers…
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="card" style={{ marginTop:16, borderColor:'rgba(245,75,75,0.3)', background:'rgba(245,75,75,0.04)', fontSize:12, color:'var(--text-muted)' }}>
        📍 {geoError}
      </div>
    );
  }

  if (state === 'done' && alerts.length === 0) {
    return (
      <div className="card" style={{ marginTop:16, fontSize:12, color:'var(--text-muted)' }}>
        ✅ No service centers for your expiring warranties found within 10 km.
      </div>
    );
  }

  return (
    <div className="card-glint" style={{ marginTop:16, borderColor:'rgba(75,232,216,0.3)' }}>
      <p className="label" style={{ marginBottom:12 }}>📍 GEO-AWARE ALERTS — NEAR YOU</p>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {alerts.map((alert, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:14, background:'var(--deep)', borderRadius:10, borderLeft:'3px solid var(--cyan)' }}>
            <span style={{ fontSize:20, marginTop:2 }}>📍</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{alert.center.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>
                {alert.distanceKm} km away · {alert.center.address}
                {alert.center.phone && <span> · {alert.center.phone}</span>}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {alert.products.map(p => (
                  <span key={p._id} className="chip warn" style={{ fontSize:10 }}>
                    {p.name} — {p.daysLeft}d left
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
              <a href={alert.directionsUrl} target="_blank" rel="noopener noreferrer"
                className="btn-primary" style={{ fontSize:10, padding:'6px 12px', textDecoration:'none' }}>
                Directions →
              </a>
              <a href={alert.mapsUrl} target="_blank" rel="noopener noreferrer"
                className="btn-ghost" style={{ fontSize:10, padding:'5px 10px', textDecoration:'none', textAlign:'center' }}>
                Maps
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeoAlertBanner;