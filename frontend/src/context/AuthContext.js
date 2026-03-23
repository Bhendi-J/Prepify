import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';

export const AuthContext = createContext();

const AUTH_BOOTSTRAP_TIMEOUT_MS = 7000;

const withTimeout = (promise, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth bootstrap timed out')), timeoutMs)
    ),
  ]);

const navigateTo = (path) => {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (credentials) => {
    const response = await apiClient.post('/api/login', credentials);
    if (response.data?.user) {
      setCurrentUser(response.data.user);
      navigateTo('/');
    }
    return response;
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/logout');
    } catch (err) {
      // Keep logout resilient even if the server session already expired.
      console.error('Logout request failed', err);
    } finally {
      setCurrentUser(null);
      navigateTo('/');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkLoggedIn = async () => {
      try {
        const response = await withTimeout(
          apiClient.get('/api/account'),
          AUTH_BOOTSTRAP_TIMEOUT_MS
        );
        if (isMounted) {
          const payload = response.data || {};
          if (payload.authenticated && payload.user) {
            setCurrentUser(payload.user);
          } else if (payload.username && payload.email) {
            // Backward compatibility with older account response shape.
            setCurrentUser({ username: payload.username, email: payload.email });
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkLoggedIn();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: '#e2e8f0',
          background: '#0f172a',
          fontFamily: 'Inter, sans-serif',
          fontSize: '1rem',
        }}
      >
        Loading application...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
