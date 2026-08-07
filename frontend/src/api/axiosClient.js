import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// PUBLIC ENDPOINTS — these never attach an Authorization header
// ============================================================================
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/refresh', '/setup/status'];

function isPublicEndpoint(url) {
  return PUBLIC_ENDPOINTS.some(ep => url?.includes(ep));
}

// ============================================================================
// REFRESH TOKEN MUTEX — only one refresh request can execute at a time
// All other 401s queue up and wait for the single refresh to complete.
// ============================================================================
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshComplete(newToken) {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================
axiosClient.interceptors.request.use(
  (config) => {
    // Never attach token to public endpoints
    if (isPublicEndpoint(config.url)) {
      return config;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================
axiosClient.interceptors.response.use(
  (response) => {
    // Return just the data object directly
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If there's no response (network error), reject immediately
    if (!error.response) {
      return Promise.reject({ error: 'Network error. Please check your connection.' });
    }

    const status = error.response.status;

    // Only handle 401 for non-public, non-retried requests
    if (status === 401 && !originalRequest._retry && !isPublicEndpoint(originalRequest.url)) {
      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(axiosClient(originalRequest));
            } else {
              reject(error.response?.data || { error: 'Session expired' });
            }
          });
        });
      }

      // Start the refresh process (we are the first 401)
      isRefreshing = true;

      try {
        const isLocal = !!localStorage.getItem('refreshToken');
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(
          (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/auth/refresh',
          { token: refreshToken }
        );

        const newAccessToken = data.accessToken;

        // Store the new access token
        if (isLocal) {
          localStorage.setItem('token', newAccessToken);
        } else {
          sessionStorage.setItem('token', newAccessToken);
        }

        // Notify all queued requests
        onRefreshComplete(newAccessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);

      } catch (refreshError) {
        // Refresh genuinely failed — clear everything and notify app
        onRefreshComplete(null);

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');

        // Dispatch event for AuthContext to handle via React Router
        // NO hard window.location.href redirect here
        window.dispatchEvent(new CustomEvent('auth:session_expired'));

        return Promise.reject({ error: 'Session expired. Please login again.' });
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors (403, 404, 500, etc.), just reject with data
    return Promise.reject(error.response?.data || { error: error.message });
  }
);

export default axiosClient;
