// Conexión con el backend. Todas las pantallas usan este `api`.
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Antes de cada petición, se agrega el token del login
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el servidor responde 401 (sin sesión), se vuelve al login
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Mensaje legible de un error del API
export function mensajeDeError(error) {
  return error.response?.data?.mensaje || 'No se pudo conectar con el servidor';
}

export default api;
