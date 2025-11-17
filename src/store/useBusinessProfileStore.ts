import { create } from 'zustand';

// Ключ для localStorage
const LOCAL_STORAGE_KEY = 'businessProfile';

interface BusinessProfileState {
    profile: string;
    // Флаг для отслеживания инициализации из localStorage
    isLoaded: boolean; 
    setProfile: (newProfile: string) => void;
    loadProfile: () => void;
}

export const useBusinessProfileStore = create<BusinessProfileState>((set, get) => ({
    profile: '',
    isLoaded: false,

    // Метод для обновления и сохранения в localStorage
    setProfile: (newProfile: string) => {
        set({ profile: newProfile });
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, newProfile);
        } catch (error) {
            console.error('Ошибка сохранения профиля в localStorage:', error);
        }
    },

    // Метод для загрузки из localStorage при инициализации
    loadProfile: () => {
        const { isLoaded } = get();
        if (isLoaded) return; // Загружаем только один раз

        try {
            const savedProfile = localStorage.getItem(LOCAL_STORAGE_KEY);
            set({ 
                profile: savedProfile || '', // Если нет данных, оставляем пустую строку
                isLoaded: true 
            });
        } catch (error) {
            console.error('Ошибка загрузки профиля из localStorage:', error);
            set({ isLoaded: true });
        }
    },
}));