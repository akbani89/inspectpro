import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, getMe } from '../services/api';

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
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const res = await getMe();
        set({ token, user: res.data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await apiLogin(email, password);
    const { access_token, ...userData } = res.data;
    await SecureStore.setItemAsync('auth_token', access_token);
    set({ token: access_token, user: userData });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null });
  },
}));
