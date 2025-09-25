// AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
// Make sure apiClient is imported
import apiClient from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
// You can remove the generic axios import if apiClient is used everywhere
// import axios from 'axios'; 
// axios.defaults.withCredentials = true; // This is already handled in apiClient

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const login = async (credentials) => {
    // This is already correct
    const response = await apiClient.post('/api/login', credentials);
    if (response.data.user) {
      setCurrentUser(response.data.user);
      navigate('/');
    }
    return response;
  };

  const logout = async () => {
    // --- CHANGE THIS ---
    // Use apiClient which points to localhost:5000
    await apiClient.post('/api/logout'); 
    setCurrentUser(null);
    navigate('/');
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        // --- AND CHANGE THIS ---
        // Use apiClient for consistency
        const response = await apiClient.get('/api/account'); 
        setCurrentUser(response.data);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  // ... rest of the file is the same
  if (loading) {
    return <div>Loading Application...</div>;
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};