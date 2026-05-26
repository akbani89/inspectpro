import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Change this to your server URL ───────────────────────────
export const API_BASE = 'http://localhost:8000/api';

const api = axios.create({ baseURL: API_BASE });

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── AUTH ──────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/auth/login', new URLSearchParams({ username: email, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

export const getMe = () => api.get('/auth/me');
export const changePassword = (current: string, next: string) =>
  api.post('/auth/change-password', { current_password: current, new_password: next });

// ── INSPECTIONS ───────────────────────────────────────────────
export const listInspections = (params?: { status?: string; search?: string; skip?: number }) =>
  api.get('/inspections', { params });

export const getInspection = (id: string) =>
  api.get(`/inspections/${id}`);

export const createInspection = (data: any) =>
  api.post('/inspections', data);

export const updateInspection = (id: string, data: any) =>
  api.patch(`/inspections/${id}`, data);

export const submitInspection = (id: string) =>
  api.post(`/inspections/${id}/submit`);

export const uploadPhoto = (inspectionId: string, uri: string, caption?: string, photoType = 'damage', damageTag?: string) => {
  const form = new FormData();
  const ext = uri.split('.').pop() || 'jpg';
  form.append('file', { uri, name: `photo.${ext}`, type: `image/${ext}` } as any);
  if (caption) form.append('caption', caption);
  if (damageTag) form.append('damage_tag', damageTag);
  form.append('photo_type', photoType);
  return api.post(`/inspections/${inspectionId}/photos`, form,
    { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const deletePhoto = (inspectionId: string, photoId: string) =>
  api.delete(`/inspections/${inspectionId}/photos/${photoId}`);

// ── REPORTS ───────────────────────────────────────────────────
export const generatePdf = (inspectionId: string) =>
  api.post(`/reports/${inspectionId}/generate-pdf`);

export const getPreviewUrl = (inspectionId: string) =>
  `${API_BASE}/reports/${inspectionId}/preview`;

export const getDownloadUrl = (inspectionId: string) =>
  `${API_BASE}/reports/${inspectionId}/download`;

// ── DASHBOARD ─────────────────────────────────────────────────
export const getDashboardStats = () => api.get('/dashboard/stats');

// ── AGENTS (admin only) ────────────────────────────────────────
export const listAgents = () => api.get('/agents');
export const createAgent = (data: any) => api.post('/agents', data);
export const updateAgent = (id: string, data: any) => api.patch(`/agents/${id}`, data);

// ── COMPANY ───────────────────────────────────────────────────
export const getMyCompany = () => api.get('/companies/me');
export const updateCompany = (data: any) => api.patch('/companies/me', data);

export default api;
