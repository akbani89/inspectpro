import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, API_BASE, setAuthToken } from '../services/api';
import axios from 'axios';

interface AuthState {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  loadStoredSession: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setAuthToken(token);
        const res = await getMe();
        set({ token, user: res.data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      setAuthToken(null);
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const res = await axios.post(`${API_BASE}/auth/login`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const token = res.data.access_token;
    await AsyncStorage.setItem('auth_token', token);
    setAuthToken(token);
    set({ token, user: res.data });
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    setAuthToken(null);
    set({ token: null, user: null });
  },
}));