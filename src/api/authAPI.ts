/* eslint-disable @typescript-eslint/no-explicit-any */
// --- КОНФИГУРАЦИЯ ---
const API_BASE_URL = 'https://vavilonus10.ru'; 
const PKCE_COLLECTION = 'vk_auth_state';
const PKCE_DOC_ID = 'pkce_data';

// --- ГЛОБАЛЬНЫЕ ТИПЫ (Для удобства, вы можете вынести их в отдельный файл 'types.ts') ---
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

// --- FIREBASE/FIRESTORE ХЕЛПЕРЫ (для PKCE) ---
// Примечание: предполагается, что глобальный объект 'firebase' и переменные 'db', 'auth' доступны.
declare const __app_id: string | undefined;


// --- API ФУНКЦИИ ---

/**
 * Шаг 1: Запрос на бэкенд для получения URL авторизации и PKCE параметров.
 * Передает __app_id в бэкенд, чтобы удовлетворить требование к идентификатору.
 */
export const vkLogin = async (): Promise<string> => {
    
    // Получаем обязательный ID приложения/клиента (вместо userId)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Включаем ID в URL запроса
    const response = await fetch(`${API_BASE_URL}/auth/vk/login?app_id=${appId}`);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    const { auth_url, code_verifier, state } = data;
    
    // Сохраняем PKCE data в localStorage
    localStorage.setItem(PKCE_COLLECTION, code_verifier);
    localStorage.setItem(PKCE_DOC_ID, state);
    
    return auth_url as string;
};
/**
 * Шаг 3: Обмен кода авторизации на JWT токены.
 * Использует PKCE data из localStorage.
 */
export const vkExchange = async (code: string, urlState: string): Promise<AuthResponse> => {
    
    // 1. Получаем сохраненные данные PKCE из localStorage
    const code_verifier = localStorage.getItem(PKCE_COLLECTION);
    const saved_state = localStorage.getItem(PKCE_DOC_ID);
    
    // 2. Удаляем временные ключи сразу, чтобы не использовать их повторно
    localStorage.removeItem(PKCE_COLLECTION);
    localStorage.removeItem(PKCE_DOC_ID);

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