import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('servicesync_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('servicesync_user');
      const storedToken = localStorage.getItem('servicesync_token');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.post('/auth/login', { email, password });
      const { success, data, message } = response.data;

      if (success && data) {
        setUser(data);
        setToken(data.token);
        localStorage.setItem('servicesync_token', data.token);
        localStorage.setItem('servicesync_user', JSON.stringify(data));
        return { success: true };
      } else {
        throw new Error(message || 'Login failed');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed';
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.post('/auth/register', { name, email, password, role });
      const { success, data, message } = response.data;

      if (success && data) {
        setUser(data);
        setToken(data.token);
        localStorage.setItem('servicesync_token', data.token);
        localStorage.setItem('servicesync_user', JSON.stringify(data));
        return { success: true };
      } else {
        throw new Error(message || 'Registration failed');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Registration failed';
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('servicesync_token');
    localStorage.removeItem('servicesync_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
