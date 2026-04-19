/**
 * src/context/NotificationContext.jsx
 *
 * Provides:
 *  - notifications[]       — full list, newest first
 *  - unreadCount           — live badge number for Sidebar
 *  - markRead(id)          — mark one read (optimistic + API)
 *  - markAllRead()         — mark all read (optimistic + API)
 *  - deleteNotif(id)       — delete one (optimistic + API)
 *  - triggerTestCheck()    — calls POST /api/notifications/test-run-checker (dev)
 *  - loading / error
 *
 * Socket.IO:
 *  Connects once when user is logged in.
 *  Joins `user:<userId>` room so the cron can push `new-notification` events
 *  directly to this browser tab.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const SOCKET_URL = 'http://localhost:5000';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const socketRef = useRef(null);

  // ── Fetch all notifications from REST API ─────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await api('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Could not load notifications.');
      console.error('[NotifCtx] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Initial fetch when user logs in ──────────────────────────────────────
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  // ── Socket.IO — connect & join personal room ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket.id);
      // Join the personal room so the cron pushes only to this user
      socket.emit('join-user', user.id || user._id);
    });

    // ── Real-time: new notification pushed by cron ─────────────────────────
    socket.on('new-notification', (notif) => {
      console.log('[socket] new-notification received:', notif._id);
      setNotifications(prev => {
        // Deduplicate in case REST fetch already loaded it
        const exists = prev.some(n => n._id === notif._id);
        return exists ? prev : [notif, ...prev];
      });
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // ── Mark one notification as read ─────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    try {
      await api(`/notifications/${id}/read`, 'PUT');
    } catch (err) {
      console.error('[NotifCtx] markRead failed:', err.message);
      // Revert on failure
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: false } : n));
    }
  }, []);

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await api('/notifications/read-all', 'PUT');
    } catch (err) {
      console.error('[NotifCtx] markAllRead failed:', err.message);
      fetchNotifications(); // re-fetch to restore correct state
    }
  }, [fetchNotifications]);

  // ── Delete one notification ───────────────────────────────────────────────
  const deleteNotif = useCallback(async (id) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    try {
      await api(`/notifications/${id}`, 'DELETE');
    } catch (err) {
      console.error('[NotifCtx] delete failed:', err.message);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ── Trigger manual warranty check (dev / demo) ────────────────────────────
  const triggerTestCheck = useCallback(async () => {
    try {
      const result = await api('/notifications/test-run-checker', 'POST');
      // Refetch after a short delay to catch any newly created notifications
      setTimeout(fetchNotifications, 1200);
      return result.message;
    } catch (err) {
      throw new Error(err.message || 'Trigger failed');
    }
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      error,
      markRead,
      markAllRead,
      deleteNotif,
      triggerTestCheck,
      refetch: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);