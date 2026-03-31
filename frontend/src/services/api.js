import axios from 'axios';
import { API_BASE } from '../config';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (username, password) => {
  try {
    const res = await api.post('/login', { username, password });
    localStorage.setItem('soc_token', res.data.access_token);
    return res.data;
  } catch (error) {
    console.warn("API Login Failed", error);
    throw error;
  }
};

export const fetchEvents = (limit = 100) => api.get(`/events?limit=${limit}`).then(r => r.data).catch(() => []);
export const fetchIncidents = () => api.get('/incidents').then(r => r.data).catch(() => []);
export const fetchHealth = () => api.get('/system/health').then(r => r.data).catch(() => ({ status: 'offline' }));
export const simulateAttack = (num = 1000) => api.post('/simulate', { num_events: num }).catch(() => null);

export default api;
