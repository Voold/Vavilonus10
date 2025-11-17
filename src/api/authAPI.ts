/* eslint-disable @typescript-eslint/no-explicit-any */
// --- КОНФИГУРАЦИЯ ---
const API_BASE_URL = 'http://127.0.0.1:8001'; 
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
declare const firebase: any;
declare const __app_id: string | undefined;
let db: any;

export const initializeFirestore = (firestoreDb: any) => {
    db = firestoreDb;
};

const getPkceDocRef = (id: string) => {
  if (!db) throw new Error("Firestore not initialized.");
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  return firebase.doc(db, `artifacts/${appId}/users/${id}/${PKCE_COLLECTION}/${PKCE_DOC_ID}`);
};

const savePkceData = async (verifier: string, state: string, id: string) => {
  if (!db || !id) throw new Error("Firestore not initialized or user ID missing.");
  await firebase.setDoc(getPkceDocRef(id), {
    code_verifier: verifier,
    state: state,
    timestamp: new Date().toISOString()
  });
};

const retrievePkceData = async (id: string) => {
  if (!db || !id) return null;
  const docSnap = await firebase.getDoc(getPkceDocRef(id));
  return docSnap.exists() ? docSnap.data() : null;
};

// --- API ФУНКЦИИ ---

/**
 * Шаг 1: Запрос на бэкенд для получения URL авторизации и PKCE параметров.
 */
export const vkLogin = async (userId: string | null): Promise<string> => {
  if (!userId) throw new Error("Authentication flow not ready (userId missing).");
  
  const response = await fetch(`${API_BASE_URL}/auth/vk/login`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data = await response.json();
  const { auth_url, code_verifier, state } = data;
  
  // Сохраняем PKCE data в Firestore
  await savePkceData(code_verifier, state, userId);
  
  return auth_url as string;
};

/**
 * Шаг 3: Обмен кода авторизации на JWT токены.
 */
export const vkExchange = async (code: string, urlState: string, userId: string | null): Promise<AuthResponse> => {
  if (!userId) throw new Error("Authentication flow not ready (userId missing).");

  // 1. Получаем сохраненный code_verifier и state
  const pkceData = await retrievePkceData(userId);
  if (!pkceData) {
     throw new Error("PKCE data not found. Cannot exchange code. Session lost?");
  }
  if (pkceData.state !== urlState) {
     // Хотя бэкенд должен проверять state, эта клиентская проверка может быть полезной
     throw new Error("State mismatch detected.");
  }
  
  const { code_verifier } = pkceData;

  // 2. Отправляем на обмен
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