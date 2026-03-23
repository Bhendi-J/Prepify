import axios from 'axios';

const apiClient = axios.create({
  // --- CHANGE THIS LINE ---
  baseURL: 'http://localhost:5001', // Use localhost instead of 127.0.0.1
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, the user's session is invalid (e.g. wiped database)
      // Redirect to home/login so the React app re-initializes AuthContext
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;