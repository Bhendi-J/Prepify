import axios from 'axios';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const skipRedirect =
        requestUrl.includes('/api/login') ||
        requestUrl.includes('/api/register') ||
        requestUrl.includes('/api/account');

      // Keep auth-form and bootstrapping failures local to their screens.
      if (!skipRedirect) {
        const publicPaths = ['/', '/login', '/register'];
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
