import axios from 'axios';

const apiClient = axios.create({
  // --- CHANGE THIS LINE ---
  baseURL: 'http://127.0.0.1:5000', // Use localhost instead of 127.0.0.1
  withCredentials: true,
});

export default apiClient;