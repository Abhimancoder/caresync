import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach authorization bearer token to every outbound request
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('caresync_auth_token');
    if (!token) {
      const savedUser = localStorage.getItem('caresync_user');
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          token = u.token;
        } catch (e) {}
      }
      token = token || 'demo-token-caretaker';
      localStorage.setItem('caresync_auth_token', token);
    }
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;
