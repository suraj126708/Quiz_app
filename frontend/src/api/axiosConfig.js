import axios from 'axios';

// Base URL for API - Uses environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_URL;

// Request interceptor to add auth token
axios.interceptors.request.use(
  async (config) => {
    // Get token from Firebase Auth if available
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('firebaseToken');
      // Redirect will be handled by the app router
    }
    return Promise.reject(error);
  }
);

export default axios;

