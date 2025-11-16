/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { 
    userApiService, 
} from '../api/authAPI';
import type { 
    UserBase, 
    UserUpdate, 
    UserDel, 
    UserCompanyAdd,
/*     LoginData,  */
/*     UserProfileResponse */
} from '../api/authAPI';


// --- Типы состояния ---
interface UserProfile {
    inn: number | null;
    fullName: string | null;
    role: string | null;
    isLoggedIn: boolean;
    // ... другие поля, которые вы хотите хранить
}

interface AuthState {
    user: UserProfile;
    isLoading: boolean;
    error: string | null;
    
    // Методы API, обернутые для Zustand
    createUser: (userData: UserBase) => Promise<void>;
    updateUser: (updateData: UserUpdate) => Promise<void>;
    deleteUser: (deleteData: UserDel) => Promise<void>;
    addUserToCompany: (data: UserCompanyAdd) => Promise<void>;

    loginUser: (loginFormData: FormData) => Promise<void>; 
    fetchUserProfile: (inn: number) => Promise<void>;
    
    // ДОБАВЛЕННЫЙ МЕТОД
    logoutUser: () => void; 
    
    // Вспомогательные методы
    setError: (message: string | null) => void;
}

// --- Создание хранилища ---
export const useAuthStore = create<AuthState>((set, get) => ({
    user: {
        inn: null,
        fullName: null,
        role: null,
        isLoggedIn: false,
    },
    isLoading: false,
    error: null,

    setError: (message) => set({ error: message }),

    // Создание пользователя
    createUser: async (userData: UserBase) => {
        set({ isLoading: true, error: null });
        try {
            await userApiService.createUser(userData);
            
            // Если создание прошло успешно, можно обновить локальное состояние
            set({
                user: { 
                    ...get().user, 
                    inn: userData.inn,
                    fullName: userData.full_name,
                    role: userData.role || null,
                },
                isLoading: false,
            });

        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Не удалось создать пользователя.';
            set({ isLoading: false, error: errorMessage });
            throw new Error(errorMessage);
        }
    },

    // Обновление пользователя
    updateUser: async (updateData: UserUpdate) => {
        set({ isLoading: true, error: null });
        try {
            await userApiService.updateUser(updateData);

            // Обновляем локальное состояние только если текущий пользователь совпадает с обновляемым
            if (get().user.inn === updateData.inn) {
                 set({
                    user: {
                        ...get().user,
                        fullName: updateData.full_name ?? get().user.fullName,
                        role: updateData.role ?? get().user.role,
                        // folder_path здесь не хранится, но можно добавить
                    },
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }

        } catch (err: any) {
            const errorMessage = err.response?.status === 404 
                ? 'Пользователь не найден (404).' 
                : err.response?.data?.detail || 'Не удалось обновить пользователя.';
            set({ isLoading: false, error: errorMessage });
            throw new Error(errorMessage);
        }
    },

    // Удаление пользователя
    deleteUser: async (deleteData: UserDel) => {
        set({ isLoading: true, error: null });
        try {
            await userApiService.deleteUser(deleteData);

            // Если удаляется текущий пользователь, сбрасываем состояние
            if (get().user.inn === deleteData.inn) {
                set({
                    user: { inn: null, fullName: null, role: null, isLoggedIn: false },
                    isLoading: false,
                });
            } else {
                 set({ isLoading: false });
            }

        } catch (err: any) {
            const errorMessage = err.response?.status === 404 
                ? 'Пользователь не найден (404).' 
                : err.response?.data?.detail || 'Не удалось удалить пользователя.';
            set({ isLoading: false, error: errorMessage });
            throw new Error(errorMessage);
        }
    },
    
    // Добавление пользователя в компанию
    addUserToCompany: async (data: UserCompanyAdd) => {
        set({ isLoading: true, error: null });
        try {
            await userApiService.addUserToCompany(data);
            set({ isLoading: false });

        } catch (err: any) {
            const errorMessage = err.response?.status === 404 
                ? 'Компания не найдена (404).' 
                : err.response?.data?.detail || 'Не удалось добавить пользователя в компанию.';
            set({ isLoading: false, error: errorMessage });
            throw new Error(errorMessage);
        }
    },

    // Вход пользователя
    // ПРИНИМАЕТ FormData, как в компоненте
    loginUser: async (loginFormData: FormData) => { 
        set({ isLoading: true, error: null });
        try {
            // Шаг 1: Аутентификация
            // userApiService.loginUser теперь принимает FormData
            const loginResponse = await userApiService.loginUser(loginFormData); 
            
            // --- НОВЫЙ КОД: Извлекаем данные из ответа ---
            const profile = loginResponse.data.user_info;

            // Шаг 2: Сохраняем данные профиля и устанавливаем статус входа
            set({
                user: { 
                    inn: profile.inn,
                    fullName: profile.full_name,
                    role: profile.role,
                    isLoggedIn: true, // Устанавливаем статус входа
                },
                isLoading: false,
                error: null,
            });
            
            // Токен: можно сохранить здесь, если он нужен для будущих запросов
            // if (loginResponse.data.token) {
            //     localStorage.setItem('token', loginResponse.data.token);
            // }

        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Ошибка входа. Проверьте ИНН и пароль.';
            set({ isLoading: false, error: errorMessage });
            throw new Error(errorMessage);
        }
    },
    
    // Получение профиля пользователя
    fetchUserProfile: async (inn: number) => {
        set({ isLoading: true, error: null });
        try {
            const response = await userApiService.fetchUserProfile(inn);
            const profile = response.data;

            set({
                user: { 
                    inn: profile.inn,
                    fullName: profile.full_name,
                    role: profile.role,
                    isLoggedIn: true, // Устанавливаем статус входа
                },
                isLoading: false,
            });

        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Не удалось загрузить профиль.';
            set({ isLoading: false, error: errorMessage });
            throw new Error(errorMessage);
        }
    },
    
    // Выход пользователя (Logout)
    logoutUser: () => {
        // Очистка токена из локального хранилища (если он там хранится)
        // localStorage.removeItem('token'); 
        
        // Сброс состояния пользователя
        set({
            user: { inn: null, fullName: null, role: null, isLoggedIn: false },
            error: null, 
            isLoading: false,
        });
    },
}));