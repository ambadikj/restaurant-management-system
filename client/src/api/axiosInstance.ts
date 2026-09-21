import axios from "axios";

/**
 * ============================================================================
 * AXIOS HTTP CLIENT & INTERCEPTOR (axiosInstance.ts)
 * ============================================================================
 * PURPOSE:
 * Centralizes all HTTP API requests sent from the React frontend to the
 * Express backend (running on port 5000).
 *
 * KEY HIGHLIGHT - AUTOMATIC JWT INJECTION:
 * Instead of manually attaching authorization headers on every individual
 * component or API call, this Axios Request Interceptor intercepts EVERY
 * outgoing request, retrieves the user's JWT token from localStorage, and
 * attaches it as a "Bearer <token>" in the Authorization header.
 * ============================================================================
 */

// 1. Create a configured Axios instance with the backend base URL
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api",
});

// 2. Register a Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Read the saved JWT token from browser localStorage
    const token = localStorage.getItem("token");

    // If a token exists, attach it to HTTP Authorization headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Forward any request preparation errors
    return Promise.reject(error);
  },
);

export default axiosInstance;
