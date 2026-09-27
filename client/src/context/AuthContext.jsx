import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate authenticated session on initial app load
  useEffect(() => {
    const token = localStorage.getItem('expenseflow_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.success && res.data?.user) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const handleSessionExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth-session-expired', handleSessionExpired);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data?.user) {
      if (res.token) {
        localStorage.setItem('expenseflow_token', res.token);
      }
      setUser(res.data.user);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.success && res.data?.user) {
      if (res.token) {
        localStorage.setItem('expenseflow_token', res.token);
      }
      setUser(res.data.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request error:', err);
    } finally {
      localStorage.removeItem('expenseflow_token');
      setUser(null);
    }
  };

  const updatePreferences = async (preferences) => {
    const res = await api.put('/auth/preferences', preferences);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
