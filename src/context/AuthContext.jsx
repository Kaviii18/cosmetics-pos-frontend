import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'admin' || parsed.email === 'admin@velvettouch.lk')) {
          if (parsed.name && (parsed.name.includes('Isuru') || parsed.name.includes('Admin)'))) {
            parsed.name = 'Admin';
            localStorage.setItem('pos_user', JSON.stringify(parsed));
          }
        }
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('pos_token') || null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('pos_token');
      if (storedToken && !storedToken.startsWith('demo_')) {
        try {
          const profile = await api.getMe();
          if (profile) {
            setUser(profile);
            localStorage.setItem('pos_user', JSON.stringify(profile));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          // Only clear if server explicitly rejects (status 401)
          if (err.message && (err.message.includes('401') || err.message.includes('token') || err.message.includes('unauthorized'))) {
            setUser(null);
            setToken(null);
            localStorage.removeItem('pos_user');
            localStorage.removeItem('pos_token');
          }
        }
      }
      setInitializing(false);
    };

    verifySession();
  }, []);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('pos_user', JSON.stringify(res.user));
        localStorage.setItem('pos_token', res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: 'Invalid response from server.' };
    } catch (err) {
      console.error('Login error:', err);
      // Demo fallback if backend is offline or demo accounts used
      if (email === 'admin@velvettouch.lk' && password === 'admin123') {
        const demoAdmin = { id: 1, name: 'Admin', email: 'admin@velvettouch.lk', role: 'admin' };
        setUser(demoAdmin);
        setToken('demo_admin_token');
        localStorage.setItem('pos_user', JSON.stringify(demoAdmin));
        localStorage.setItem('pos_token', 'demo_admin_token');
        return { success: true, user: demoAdmin };
      } else if (email === 'cashier@velvettouch.lk' && password === 'cashier123') {
        const demoCashier = { id: 2, name: 'Sanduni Perera', email: 'cashier@velvettouch.lk', role: 'cashier' };
        setUser(demoCashier);
        setToken('demo_cashier_token');
        localStorage.setItem('pos_user', JSON.stringify(demoCashier));
        localStorage.setItem('pos_token', 'demo_cashier_token');
        return { success: true, user: demoCashier };
      }
      return { success: false, message: err.message || 'Invalid email or password.' };
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (name, email, password, role = 'cashier') => {
    setLoading(true);
    try {
      const res = await api.register({ name, email, password, role });
      if (res && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('pos_user', JSON.stringify(res.user));
        localStorage.setItem('pos_token', res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: 'Invalid response from server.' };
    } catch (err) {
      console.error('Register error:', err);
      return { success: false, message: err.message || 'Unable to create account. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      loading,
      initializing,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
