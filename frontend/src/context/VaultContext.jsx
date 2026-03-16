import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';

const VaultContext = createContext();

export const VaultProvider = ({ children }) => {
  const { user } = useAuth();
  const [vaults, setVaults] = useState([]);
  const [activeVault, setActiveVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) { setVaults([]); setActiveVault(null); setLoading(false); return; }
    loadVaults();

    // Connect socket
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('vault-updated', (data) => {
      console.log('Vault updated by another member:', data);
      loadVaults();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  const loadVaults = async () => {
    try {
      const data = await api('/vaults/my');
      setVaults(data);
      const saved = localStorage.getItem('activeVaultId');
      const found = data.find(v => v._id === saved);
      setActiveVault(found || data[0] || null);
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

  const refreshVaults = () => loadVaults();

  const emitVaultUpdate = (vaultId, action) => {
    if (socketRef.current) {
      socketRef.current.emit('vault-update', { vaultId, action, userId: user?._id });
    }
  };

  return (
    <VaultContext.Provider value={{ vaults, activeVault, switchVault, refreshVaults, emitVaultUpdate, loading }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => useContext(VaultContext);