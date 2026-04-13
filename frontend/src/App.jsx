import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Scan from './pages/Scan';
import Vault from './pages/Vault';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import BillHistory from './pages/BillHistory';
import NotificationPrefs from './pages/NotificationPrefs';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--void)',color:'var(--gold)',fontFamily:'Syne,sans-serif' }}>Loading vault...</div>;
  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <AuthProvider>
      <VaultProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"          element={<Landing />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/register"  element={<Register />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/products"  element={<PrivateRoute><Products /></PrivateRoute>} />
            <Route path="/scan"      element={<PrivateRoute><Scan /></PrivateRoute>} />
            <Route path="/vault"     element={<PrivateRoute><Vault /></PrivateRoute>} />
            <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
            <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/notifications"      element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/bills"              element={<PrivateRoute><BillHistory /></PrivateRoute>} />
            <Route path="/notification-prefs" element={<PrivateRoute><NotificationPrefs /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </VaultProvider>
    </AuthProvider>
  );
};

export default App;