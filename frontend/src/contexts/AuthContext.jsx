import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authApi from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigateRef = useRef(null);
  const locationRef = useRef(null);

  // We use refs for navigate/location to avoid re-creating effects
  // AuthProvider is inside <Router>, so these hooks are safe here.
  try {
    const navigate = useNavigate();
    const location = useLocation();
    navigateRef.current = navigate;
    locationRef.current = location;
  } catch (e) {
    // Fallback if not inside Router (shouldn't happen in normal flow)
  }

  // ============================================================================
  // STORAGE SYNC — read token/user from localStorage or sessionStorage
  // ============================================================================
  const syncSessionFromStorage = useCallback(() => {
    const localUser = localStorage.getItem('user');
    const localToken = localStorage.getItem('token');
    const sessionUser = sessionStorage.getItem('user');
    const sessionToken = sessionStorage.getItem('token');

    if (localUser && localToken) {
      return { token: localToken, userStr: localUser, isLocal: true };
    }
    if (sessionUser && sessionToken) {
      return { token: sessionToken, userStr: sessionUser, isLocal: false };
    }
    return null;
  }, []);

  // ============================================================================
  // INITIALIZE — runs once on mount
  // ============================================================================
  useEffect(() => {
    const initializeAuth = async () => {
      const session = syncSessionFromStorage();
      if (session) {
        try {
          // Set user from storage immediately to avoid flash
          const storedUser = JSON.parse(session.userStr);
          setUser(storedUser);

          // Validate with backend (this will use the refresh mutex if token expired)
          const response = await authApi.validateSession();
          if (response && response.user) {
            setUser(response.user);
            // Update storage with fresh user data
            const storage = session.isLocal ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(response.user));
          }
        } catch (e) {
          console.warn('[AuthContext] Session validation failed:', e);
          // DON'T immediately logout here — the axiosClient interceptor 
          // already tried to refresh. If we reach this catch, it means
          // the refresh genuinely failed and tokens are already cleared.
          // Just clear user state.
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []); // Only run once on mount

  // ============================================================================
  // SESSION EXPIRED LISTENER — handles event from axiosClient interceptor
  // ============================================================================
  useEffect(() => {
    const handleSessionExpired = () => {
      console.warn('[AuthContext] Session expired event received');
      setUser(null);
      // Navigate via React Router instead of hard window.location.href
      if (navigateRef.current) {
        const currentPath = locationRef.current?.pathname || '';
        // Only redirect if not already on login/setup page
        if (currentPath !== '/login' && currentPath !== '/setup' && currentPath !== '/') {
          navigateRef.current('/login', { replace: true });
        }
      }
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session_expired', handleSessionExpired);
  }, []);

  // ============================================================================
  // MULTI-TAB SYNC — handles storage changes from other tabs
  // ============================================================================
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout') {
        // Another tab logged out
        setUser(null);
        if (navigateRef.current) {
          navigateRef.current('/login', { replace: true });
        }
        return;
      }

      if (e.key === 'token' || e.key === 'user') {
        const session = syncSessionFromStorage();
        if (session) {
          try {
            setUser(JSON.parse(session.userStr));
          } catch (err) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncSessionFromStorage]);

  // ============================================================================
  // LOGIN
  // ============================================================================
  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    if (response && response.accessToken && response.user) {
      const storage = credentials.rememberMe ? localStorage : sessionStorage;

      storage.setItem('token', response.accessToken);
      storage.setItem('refreshToken', response.refreshToken);
      storage.setItem('user', JSON.stringify(response.user));

      setUser(response.user);
      return response.user;
    }
    throw new Error('Invalid response from server');
  };

  // ============================================================================
  // LOGOUT
  // ============================================================================
  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    // Broadcast logout to other tabs
    localStorage.setItem('logout', Date.now().toString());
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
