import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) { setLoading(false); return; }

      // Try to restore from localStorage first (fast path)
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          // If createdAt is missing (old session), fetch fresh data from server
          if (!parsed.createdAt) {
            try {
              const fresh = await api('/auth/me');
              if (fresh) {
                const updated = { ...parsed, ...fresh };
                setUser(updated);
                localStorage.setItem('user', JSON.stringify(updated));
              }
            } catch { /* non-fatal — use what we have */ }
          }
        } catch { /* bad JSON — clear it */ }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /**
   * Merge partial updates into the current user state & localStorage.
   * Call after a successful PUT /api/auth/me so the UI stays in sync.
   */
  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);