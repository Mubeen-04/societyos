import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('societyos_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('societyos_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.success) {
            // Attach computed permissions for UI visibility
            const userWithPermissions = { ...res.data, permissions: [] };
            try {
              const { computePermissionsForRole } = await import('../utils/permissions');
              userWithPermissions.permissions = computePermissionsForRole(res.data.role || res.data?.role);
            } catch (e) {
              userWithPermissions.permissions = [];
            }
            setUser(userWithPermissions);
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      localStorage.setItem('societyos_token', res.data.token);
      setToken(res.data.token);
      // compute permissions and attach
      const userWithPermissions = { ...res.data.user, permissions: [] };
      try {
        const { computePermissionsForRole } = await import('../utils/permissions');
        userWithPermissions.permissions = computePermissionsForRole(res.data.user.role || res.data.user?.role);
      } catch (e) {
        userWithPermissions.permissions = [];
      }
      setUser(userWithPermissions);
      return res.data;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.success) {
      localStorage.setItem('societyos_token', res.data.token);
      setToken(res.data.token);
      const userWithPermissions = { ...res.data.user, permissions: [] };
      try {
        const { computePermissionsForRole } = await import('../utils/permissions');
        userWithPermissions.permissions = computePermissionsForRole(res.data.user.role || res.data.user?.role);
      } catch (e) {
        userWithPermissions.permissions = [];
      }
      setUser(userWithPermissions);
      return res.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('societyos_token');
    localStorage.removeItem('societyos_user');
    setToken(null);
    setUser(null);
  };

  // Instant demo switcher for recruiter & review evaluation
  const switchDemoRole = async (roleEmail) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: roleEmail, password: 'Password123!' });
      if (res.success) {
        localStorage.setItem('societyos_token', res.data.token);
        setToken(res.data.token);
        const userWithPermissions = { ...res.data.user, permissions: [] };
        try {
          const { computePermissionsForRole } = await import('../utils/permissions');
          userWithPermissions.permissions = computePermissionsForRole(res.data.user.role || res.data.user?.role);
        } catch (e) {
          userWithPermissions.permissions = [];
        }
        setUser(userWithPermissions);
      }
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        switchDemoRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
