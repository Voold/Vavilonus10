/* eslint-disable @typescript-eslint/no-explicit-any */
// --- КОНФИГУРАЦИЯ ---
const API_BASE_URL = 'https://vavilonus10.ru'; 
const PKCE_VERIFIER_KEY = 'vk_code_verifier'; // Ключ для localStorage
const PKCE_STATE_KEY = 'vk_state';           // Ключ для localStorage

// --- ГЛОБАЛЬНЫЕ ТИПЫ ---
export interface User {
    vk_id: number;
    email: string;
    full_name: string;
}

export interface AuthResponse {
    message: string;
    access_token: string;
    token_type: 'bearer';
    expires_in: number;
    refresh_token: string;
    user: User;
}

// --- API ФУНКЦИИ ---

/**
 * Шаг 1: Запрос на бэкенд для получения URL авторизации и PKCE параметров.
 * Сохраняет PKCE data в localStorage.
 */
export const vkLogin = async (): Promise<string> => {
    
    const response = await fetch(`${API_BASE_URL}/auth/vk/login`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    const { auth_url, code_verifier, state } = data;
    
    // Сохраняем PKCE data в localStorage
    localStorage.setItem(PKCE_VERIFIER_KEY, code_verifier);
    localStorage.setItem(PKCE_STATE_KEY, state);
    
    return auth_url as string;
};

/**
 * Шаг 3: Обмен кода авторизации на JWT токены.
 * Использует PKCE data из localStorage.
 */
export const vkExchange = async (code: string, urlState: string): Promise<AuthResponse> => {

    // 1. Получаем сохраненные данные PKCE из localStorage
    const code_verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
    const saved_state = localStorage.getItem(PKCE_STATE_KEY);
    
    // 2. Удаляем временные ключи сразу, чтобы не использовать их повторно
    localStorage.removeItem(PKCE_VERIFIER_KEY);
    localStorage.removeItem(PKCE_STATE_KEY);

    if (!code_verifier || !saved_state) {
        throw new Error("PKCE data not found in local storage. Cannot exchange code. Session lost?");
    }
    
    // 3. Проверяем state
    if (saved_state !== urlState) {
        throw new Error("State mismatch detected.");
    }
    
    // 4. Отправляем на обмен
    const body = new URLSearchParams({
        code: code,
        state: urlState,
        code_verifier: code_verifier
    });

    const response = await fetch(`${API_BASE_URL}/auth/vk/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.detail || "Exchange failed.");
    }
    
    return data as AuthResponse;
};

/**
 * Обновление токенов.
 */
export const refreshTokens = async (refreshToken: string): Promise<Omit<AuthResponse, 'user'>> => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Refresh failed.");
    }
    
    return data as Omit<AuthResponse, 'user'>;
};

/**
 * Вызов защищенного эндпоинта.
 */
export const fetchProtected = async (accessToken: string) => {
    const response = await fetch(`${API_BASE_URL}/api/protected`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const data = await response.json();
    return { ok: response.ok, data };
};
