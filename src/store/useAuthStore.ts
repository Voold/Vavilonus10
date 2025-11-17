import { create } from 'zustand';
import type { User } from '../api/authAPI';

// --- ТИПЫ ХРАНИЛИЩА ---
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthReady: boolean;
  userId: string | null;
  
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthReady: (ready: boolean, id: string | null) => void;
  clearAuth: () => void;
}

// --- ZUSTAND ХРАНИЛИЩЕ ---
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('vk_access_token') || null,
  refreshToken: localStorage.getItem('vk_refresh_token') || null,
  isLoading: false,
  isAuthReady: false,
  userId: null,

  setTokens: (access, refresh) => {
    localStorage.setItem('vk_access_token', access);
    localStorage.setItem('vk_refresh_token', refresh);
    set({ accessToken: access, refreshToken: refresh });
  },
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setAuthReady: (ready, id) => set({ isAuthReady: ready, userId: id }),
  clearAuth: () => {
    localStorage.removeItem('vk_access_token');
    localStorage.removeItem('vk_refresh_token');
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));