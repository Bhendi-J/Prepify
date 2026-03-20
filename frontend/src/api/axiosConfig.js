import axios from 'axios';

const apiClient = axios.create({
  // --- CHANGE THIS LINE ---
  baseURL: 'http://localhost:5001', // Use localhost instead of 127.0.0.1
  withCredentials: true,
});

export default apiClient;