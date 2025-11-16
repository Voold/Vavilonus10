import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

const API_URL = 'https://vavilonus10.ru/api';

const authAPI: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        
    },
});


// UserBase (для POST /users/)
export interface UserBase {
    full_name: string;
    inn: number;
    role?: string;
    folder_path?: string;
}

export interface LoginResponse {
    message: string;
    token?: string; // Если токен возвращается
    user_info: {
        id: number;
        full_name: string;
        inn: number;
        role: string;
    }
}

// UserUpdate (для PUT /users/)
export interface UserUpdate {
    inn: number;
    full_name?: string;
    role?: string;
    folder_path?: string;
}

// UserDel (для DELETE /users/ и как часть PUT /user/)
export interface UserDel {
    inn: number;
}

// CompanyId (как часть PUT /user/)
export interface CompanyId {
    id: number; // ID компании
}

// Комбинированная схема для PUT /user/
export interface UserCompanyAdd extends UserDel, CompanyId {}

export interface LoginData {
    inn: number;
    password: string;
}

export interface UserProfileResponse {
    inn: number;
    full_name: string;
    role: string;
    folder_path: string;
}

// --- API-методы ---
export const userApiService = {

    /**
     * POST /users/ - Создание нового пользователя с нуля
     * @param userData Данные для создания пользователя (full_name, inn, role?, folder_path?)
     */
    async createUser(userData: UserBase): Promise<AxiosResponse<void>> {
        // Ответ: 200 Success
        return authAPI.post<void>('/users/', userData);
    },

    /**
     * PUT /users/ - Обновление пользователя по ИНН
     * @param updateData Данные для обновления пользователя (inn, full_name?, role?, folder_path?)
     */
    async updateUser(updateData: UserUpdate): Promise<AxiosResponse<void>> {
        // Ответы: 200 (Успех), 404 (Пользователь не найден)
        return authAPI.put<void>('/users/', updateData);
    },

    /**
     * DELETE /users/ - Удаление пользователя по ИНН из всех компаний
     * @param deleteData Данные для удаления (inn)
     */
    async deleteUser(deleteData: UserDel): Promise<AxiosResponse<void>> {
        // Ответы: 200 (Успех), 404 (Пользователь не найден)
        // Axios.delete обычно не принимает тело, но по спецификации API требует Content-Type: application/json. 
        // Передаем данные в `data` поле конфигурации.
        return authAPI.delete<void>('/users/', { data: deleteData });
    },

    /**
     * PUT /user/ - Добавление пользователя в компанию по ИНН и ID компании
     * @param data Данные для добавления пользователя в компанию (inn, id)
     */
    async addUserToCompany(data: UserCompanyAdd): Promise<AxiosResponse<void>> {
        // Примечание: Автоматически создает нового пользователя если ИНН не существует.
        // Ответы: 200 (Успех), 404 (Компания не существует)
        return authAPI.put<void>('/user/', data);
    },

     /**
     * POST /auth/login/ - Вход пользователя
     * @param loginData Данные для входа (inn, password)
     * @returns Токен или подтверждение успеха
     */
    async loginUser(loginFormData: FormData): Promise<AxiosResponse<LoginResponse>> {
        // Используем /auth/login/ или тот URL, который ожидает сервер
        return authAPI.post<LoginResponse>('/login_handler', loginFormData); 
    },

    /**
     * GET /users/{inn} - Получение профиля пользователя
     * @param inn ИНН пользователя
     */
    async fetchUserProfile(inn: number): Promise<AxiosResponse<UserProfileResponse>> {
        // Ответ: 200 Success
        return authAPI.get<UserProfileResponse>(`/users/${inn}`);
    },
};