import axios from 'axios';
import { toastRef } from '../utils/toastRef';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "https://social-network-q2av.onrender.com" });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.message || 'Bir hata oluştu';
    toastRef(msg, 'error');
    return Promise.reject(err);
  }
);
export default api;