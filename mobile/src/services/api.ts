import axios from 'axios';

export const API_BASE = 'https://inspectpro-api.fly.dev/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

api.interceptors.request.use((config) => {
  console.log('REQUEST TO:', config.url, '| AUTH:', config.headers.Authorization ? 'YES' : 'NO');
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API ERROR:', JSON.stringify({
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    }));
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  return await axios.post(`${API_BASE}/auth/login`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
};

export const getMe = () => api.get('/auth/me');
export const changePassword = (current: string, next: string) =>
  api.post('/auth/change-password', { current_password: current, new_password: next });

export const listInspections = (params?: { status?: string; search?: string; skip?: number }) =>
  api.get('/inspections/', { params });

export const getInspection = (id: string) =>
  api.get(`/inspections/${id}`);

export const createInspection = (data: any) =>
  api.post('/inspections/', data);

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

export const generatePdf = (inspectionId: string) =>
  api.post(`/reports/${inspectionId}/generate-pdf`);

export const getPreviewUrl = (inspectionId: string) =>
  `${API_BASE}/reports/${inspectionId}/preview`;

export const getDownloadUrl = (inspectionId: string) =>
  `${API_BASE}/reports/${inspectionId}/download`;

export const getDashboardStats = () => api.get('/dashboard/stats');

export const listAgents = () => api.get('/agents');
export const createAgent = (data: any) => api.post('/agents', data);
export const updateAgent = (id: string, data: any) => api.patch(`/agents/${id}`, data);

export const getMyCompany = () => api.get('/companies/me');
export const updateCompany = (data: any) => api.patch('/companies/me', data);

export default api;