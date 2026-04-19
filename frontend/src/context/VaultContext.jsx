import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';

const VaultContext = createContext();
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

export const VaultProvider = ({ children }) => {
  const { user } = useAuth();
  const [vaults,      setVaults]      = useState([]);
  const [activeVault, setActiveVault] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setVaults([]);
      setActiveVault(null);
      setLoading(false);
      return;
    }
    loadVaults();

    socketRef.current = io(SOCKET_URL);

    // Existing vault-updated event (product changes etc.)
    socketRef.current.on('vault-updated', () => loadVaults());

    // NEW — when THIS user gets invited to a vault, reload their vault list
    socketRef.current.on('vault-invite', (data) => {
      if (data.userId === user._id?.toString() || data.userId === user._id) {
        loadVaults();
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  const loadVaults = async () => {
    try {
      const data = await api('/vaults/my');
      setVaults(data);

      const savedId = localStorage.getItem('activeVaultId');
      const found   = data.find(v => v._id === savedId);
      const chosen  = found || data[0] || null;
      setActiveVault(chosen);

      if (chosen && socketRef.current) {
        socketRef.current.emit('join-vault', chosen._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const switchVault = (vault) => {
    setActiveVault(vault);
    localStorage.setItem('activeVaultId', vault._id);
    if (socketRef.current) socketRef.current.emit('join-vault', vault._id);
  };

  const deleteVault = async (vaultId) => {
    await api(`/vaults/${vaultId}`, 'DELETE');
    const updated = vaults.filter(v => v._id !== vaultId);
    setVaults(updated);
    if (activeVault?._id === vaultId) {
      const next = updated[0] || null;
      setActiveVault(next);
      if (next) localStorage.setItem('activeVaultId', next._id);
      else localStorage.removeItem('activeVaultId');
    }
  };

  const refreshVaults  = () => loadVaults();
  const emitVaultUpdate = (vaultId, action) => {
    if (socketRef.current)
      socketRef.current.emit('vault-update', { vaultId, action, userId: user?._id });
  };

  return (
    <VaultContext.Provider value={{
      vaults, activeVault, switchVault,
      deleteVault, refreshVaults, emitVaultUpdate, loading,
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => useContext(VaultContext);
