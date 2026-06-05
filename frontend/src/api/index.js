import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Ajoute automatiquement le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si le token expire, redirige vers login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = (username, password) =>
  api.post('/token/', { username, password });

export const getSystems = () => api.get('/systems/');

export const getSystemDetail = (systemId, days = 7) =>
  api.get(`/systems/${systemId}/?days=${days}`);

export default api;