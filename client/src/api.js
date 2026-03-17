// client/src/api.js
import axios from 'axios';
import server from './environment';
const API = axios.create({
  baseURL: `${server}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

import { getSocket } from './socket';

// attach token automatically if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.getSocket = getSocket;

export default API;
