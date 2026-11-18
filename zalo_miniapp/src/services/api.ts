import axios from 'axios';
import { setupZaloMockAdapter } from './mockAdapter';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

if (import.meta.env.VITE_USE_MOCK === 'true') {
  setupZaloMockAdapter(api);
  console.info('[Zalo Mini App] Đang chạy chế độ Mock Data (VITE_USE_MOCK=true)');
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('canteen_zalo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn('Phiên đăng nhập đã hết hạn');
    }
    return Promise.reject(err);
  }
);

