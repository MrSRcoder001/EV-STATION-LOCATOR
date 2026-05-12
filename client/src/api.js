// client/src/api.js
import axios from 'axios';
import server from './environment';
const API = axios.create({
  baseURL: `${server}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

import { disconnectSocket, getSocket } from './socket';

// attach token automatically if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || '').toLowerCase();
    const isAuthFailure = status === 401 || (status === 403 && message.includes('blocked'));

    if (isAuthFailure) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      disconnectSocket();
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }

    return Promise.reject(error);
  }
);

API.getSocket = getSocket;

export default API;
