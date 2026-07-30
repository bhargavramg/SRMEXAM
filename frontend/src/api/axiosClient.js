import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => {
    return response.data; // Return just the data object directly
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Implement Refresh Token Logic here if your backend supports it
        // const refreshToken = localStorage.getItem('refreshToken');
        // const { data } = await axios.post('/api/auth/refresh', { token: refreshToken });
        // localStorage.setItem('token', data.token);
        // originalRequest.headers.Authorization = `Bearer ${data.token}`;
        // return axiosClient(originalRequest);
        
        // For now, auto logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    // Optionally trigger a global notification event here
    return Promise.reject(error.response?.data || error.message);
  }
);

export default axiosClient;
