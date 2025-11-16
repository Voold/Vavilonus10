import type { AxiosResponse } from 'axios';
import { publicApi } from './api';

export interface LoginResponse {
    message: string;
    token?: string; 
    user_info: {
        id: number;
        full_name: string;
        inn: number;
        role: string;
    }
}

export interface UserBase {
    full_name: string;
    inn: number;
    role?: string;
    folder_path?: string;
}

export interface UserUpdate {
    inn: number;
    full_name?: string;
    role?: string;
    folder_path?: string;
}

export interface UserDel {
    inn: number;
}

export interface CompanyId {
    id: number;
}

export interface UserCompanyAdd extends UserDel, CompanyId {}

export interface UserProfileResponse {
    inn: number;
    full_name: string;
    role: string;
    folder_path: string;
}


// --- API-методы ---
export const authService = {

    /**
     * POST /login_handler - Вход пользователя. Ожидает FormData.
     * @param loginFormData FormData с полями inn и password.
     */
    async loginUser(loginFormData: FormData): Promise<AxiosResponse<LoginResponse>> {
        // Используем publicApi, так как токен еще не получен
        return publicApi.post<LoginResponse>('/login_handler', loginFormData); 
    },

    /**
     * GET /users/{inn} - Получение профиля пользователя
     * @param inn ИНН пользователя
     */
    async fetchUserProfile(inn: number): Promise<AxiosResponse<UserProfileResponse>> {
        // Здесь используется publicApi, но в реальном приложении это может требовать protectedApi, 
        // если токен уже установлен (например, в состоянии после логина).
        // Если API требует токен, используйте protectedApi.
        // Я оставляю publicApi, следуя вашему примеру.
        return publicApi.get<UserProfileResponse>(`/users/${inn}`);
    },

    // --- Методы администрирования пользователей (используют protectedApi) ---
    
    // Все эти методы требуют токена, поэтому в реальной жизни они должны быть в protectedApi.
    // Для простоты, я оставляю их в userApiService, но при изменении `protectedApi` в `api.ts` они будут работать корректно.

    /** POST /users/ - Создание нового пользователя */
    // ... (можно перенести сюда или оставить в userApiService)
};