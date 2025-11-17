import { create } from 'zustand';

// Тип для информации о пользователе (должен соответствовать бэкенду)
export interface User {
    vk_id: number;
    email: string;
    full_name: string;
}

// Интерфейс состояния
interface AuthState {
    // Основные токены и пользователь
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    isLoading: boolean;
    
    // Действия
    setTokens: (accessToken: string, refreshToken: string) => void;
    setUser: (user: User) => void;
    setLoading: (loading: boolean) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    // Состояние
    accessToken: null,
    refreshToken: null,
    user: null,
    isLoading: false,

    // Действия
    setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading }),
    
    // При выходе просто очищаем данные, хранящиеся в памяти
    clearAuth: () => set({ 
        accessToken: null, 
        refreshToken: null, 
        user: null, 
        isLoading: false
    }),
}));