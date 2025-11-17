/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogIn, RefreshCw, Lock, User as UserIcon, Loader2, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { vkLogin, vkExchange, refreshTokens, fetchProtected, initializeFirestore } from '../api/authAPI';
//import { User } from './AuthAPI'; 
// Импорт CSS модуля
import styles from '../styles/AuthPage.module.css';

// --- ГЛОБАЛЬНЫЕ FIREBASE ПЕРЕМЕННЫЕ (для инициализации) ---
declare const firebase: any;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

let auth: any; // Firebase Auth

const AuthPage: React.FC = () => {
  const { 
    user, accessToken, refreshToken, isLoading, isAuthReady, userId, 
    setTokens, setUser, setLoading, setAuthReady, clearAuth 
  } = useAuthStore();
  
  const [error, setError] = useState<string | null>(null);
  const [protectedResult, setProtectedResult] = useState<{ ok: boolean, data: any } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProtectedLoading, setIsProtectedLoading] = useState(false);

  // --- ИНИЦИАЛИЗАЦИЯ FIREBASE (только один раз) ---
  useEffect(() => {
    if (typeof firebase === 'undefined') {
      setError("Firebase SDK is not available.");
      return;
    }
    
    const initialize = async () => {
      try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        if (!firebaseConfig) throw new Error("Firebase config not found.");

        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.getFirestore(app);
        auth = firebase.getAuth(app);
        initializeFirestore(db); // Передаем Firestore DB в AuthAPI

        // Аутентификация: вход
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
           await firebase.signInWithCustomToken(auth, initialAuthToken);
        } else {
           await firebase.signInAnonymously(auth);
        }
        
        // Устанавливаем слушатель состояния аутентификации
        const unsubscribe = firebase.onAuthStateChanged(auth, (user: any) => {
          const currentId = user ? user.uid : (auth.currentUser?.uid || crypto.randomUUID());
          setAuthReady(true, currentId);
        });
        
        return () => unsubscribe();
      } catch (e: any) {
        console.error("Firebase initialization failed:", e);
        setError(`Ошибка инициализации: ${e.message}`);
      }
    };
    initialize();
  }, [setAuthReady]);

  // --- ОБРАБОТКА CALLBACK VK ID (Шаг 2/3) ---
  const handleCallbackExchange = useCallback(async (code: string, state: string) => {
    if (!userId) return; 
    
    setLoading(true);
    setError(null);

    try {
      const authData = await vkExchange(code, state, userId);
      setTokens(authData.access_token, authData.refresh_token);
      setUser(authData.user);
      
      // Очищаем URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e: any) {
      console.error("VK Exchange failed:", e);
      setError(`Ошибка обмена кода: ${e.message}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setLoading(false);
    }
  }, [userId, setTokens, setUser, setLoading]);

  // Проверка URL на наличие code и state при готовности Auth
  useEffect(() => {
    if (isAuthReady && userId) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && state) {
        handleCallbackExchange(code, state);
      }
    }
  }, [isAuthReady, userId, handleCallbackExchange]);


  // --- ОБРАБОТЧИКИ КНОПОК ---
  const handleLogin = async () => {
    if (isLoading || !isAuthReady || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const authUrl = await vkLogin(userId);
      window.location.href = authUrl; 
    } catch (e: any) {
      setError(`Ошибка инициации логина: ${e.message}`);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!refreshToken || isRefreshing) return;
    setIsRefreshing(true);
    setError(null);

    try {
      const data = await refreshTokens(refreshToken);
      setTokens(data.access_token, data.refresh_token);
      setError(null);
    } catch (e: any) {
      setError(`Ошибка обновления: ${e.message}. Токен отозван?`);
      clearAuth();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleProtected = async () => {
    if (!accessToken || isProtectedLoading) return;
    setIsProtectedLoading(true);
    setError(null);
    setProtectedResult(null);
    
    try {
      const result = await fetchProtected(accessToken);
      setProtectedResult(result);
      if (!result.ok) {
        setError(`Protected Access Error: ${result.data.detail || 'Неизвестная ошибка'}`);
      }
    } catch (e: any) {
      setError(`Ошибка запроса Protected: ${e.message}`);
    } finally {
      setIsProtectedLoading(false);
    }
  };
  
  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setProtectedResult(null);
    setError(null);
  };

  const isLoadingOrNotReady = isLoading || !isAuthReady;
  const isLoggedIn = !!accessToken;
  const iconSize = 18;
  
  const ProtectedResultDisplay = useMemo(() => {
    if (!protectedResult) return null;
    const { ok, data } = protectedResult;
    const resultClass = ok 
      ? styles.resultBoxSuccess 
      : styles.resultBoxFailure;
    const title = ok ? "Доступ разрешен" : "Доступ запрещен";
    const Icon = ok ? CheckCircle : AlertTriangle;
    
    return (
      <div className={`${styles.resultBox} ${resultClass}`}>
        <div className={styles.resultTitle}>
          <Icon size={iconSize} />
          <span>{title}</span>
        </div>
        <pre className={styles.resultPre}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }, [protectedResult]);


  return (
    <div className={styles.card}>
        <h1 className={styles.title}>
            Войти через VK
        </h1>
        <p className={styles.subtitle}>
            {isAuthReady 
              ? `Инициализация завершена. User ID: ${userId}`
              : "Инициализация Firebase..."
            }
        </p>

        {error && (
          <div className={styles.errorBox}>
            <AlertTriangle className={styles.errorBoxIcon} size={iconSize} /> {error}
          </div>
        )}

        {!isLoggedIn ? (
          <button
            onClick={handleLogin}
            disabled={isLoadingOrNotReady}
            className={styles.loginButton}
          >
            {isLoadingOrNotReady ? (
              <Loader2 className={`${styles.buttonIcon} ${styles.animateSpin} `} size={iconSize} />
            ) : (
              <LogIn className={styles.buttonIcon} size={iconSize} />
            )}
            {isLoading ? 'Обработка VK ID Callback...' : 'Войти через VK ID'}
          </button>
        ) : (
          <div className={styles.loggedInContainer}>

            <div className={styles.userInfoBox}>
              <h2 className={styles.userInfoTitle}>
                <UserIcon className={styles.buttonIcon} size={iconSize} />
                Авторизован
              </h2>
              <p className={styles.userInfoText}>
                <span>Имя:</span> {user?.full_name || 'N/A'}
              </p>
              <p className={styles.userInfoText}>
                <span>Email:</span> {user?.email || 'N/A'}
              </p>
              <p className={styles.userInfoText}>
                <span>VK ID:</span> {user?.vk_id || 'N/A'}
              </p>
            </div>

            <div className={styles.jwtControlBox}>
                <h2 className={styles.jwtTitle}>Управление JWT</h2>

                <div className={styles.tokenSection}>
                    <label className={styles.tokenLabel}>Refresh Token (Срок: 30 дней)</label>
                    <textarea 
                      rows={2}
                      readOnly 
                      value={refreshToken || 'Нет Refresh Token'} 
                      className={styles.tokenArea}
                    />
                    <button
                      onClick={handleRefresh}
                      disabled={!refreshToken || isRefreshing}
                      className={styles.refreshButton}
                    >
                      {isRefreshing ? (
                        <Loader2 className={`${styles.buttonIcon} animate-spin`} size={iconSize} />
                      ) : (
                        <RefreshCw className={styles.buttonIcon} size={iconSize} />
                      )}
                      Обновить токены
                    </button>
                </div>

                <div className={styles.separator}></div>

                <div className={styles.tokenSection}>
                    <label className={styles.tokenLabel}>Access Token (Срок: 30 мин)</label>
                    <textarea 
                      rows={2}
                      readOnly 
                      value={accessToken || 'Нет Access Token'} 
                      className={styles.tokenArea}
                    />
                    <button
                      onClick={handleProtected}
                      disabled={!accessToken || isProtectedLoading}
                      className={styles.protectedButton}
                    >
                      {isProtectedLoading ? (
                        <Loader2 className={`${styles.buttonIcon} animate-spin`} size={iconSize} />
                      ) : (
                        <Lock className={styles.buttonIcon} size={iconSize} />
                      )}
                      Проверить /api/protected
                    </button>
                </div>
            </div>

            {ProtectedResultDisplay}

            <button
                onClick={handleLogout}
                className={styles.logoutButton}
            >
                <LogOut className={styles.buttonIcon} size={iconSize} /> Выйти
            </button>
          </div>
        )}
      </div>
  );
};

export default AuthPage;