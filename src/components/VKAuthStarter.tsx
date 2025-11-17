/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore'; // Используем Zustand Store
import { vkLogin } from '../api/authAPI'; // Используем API с localStorage
import styles from '../styles/AuthPage.module.css'; 

const VKAuthStarter: React.FC = () => {
    const { accessToken, isLoading, setLoading, clearAuth } = useAuthStore();
    const [error, setError] = React.useState<string | null>(null);

    // Если токен есть, пользователь авторизован, можно сразу перенаправить на /home
    React.useEffect(() => {
        if (accessToken) {
             // Используем history.replace для очистки истории и перехода
             window.location.replace('/home'); 
        }
    }, [accessToken]);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        
        // Очищаем старые токены из Zustand и PKCE data из localStorage
        clearAuth(); 

        try {
            // Запрашиваем auth_url (API сохраняет PKCE data в localStorage)
            const authUrl = await vkLogin(); 
            
            // Выполняем полный редирект на VK ID
            window.location.href = authUrl; 
        } catch (e: any) {
            setError(`Ошибка инициации логина: ${e.message}`);
            setLoading(false);
        }
    };
    
    // Если токен есть, показываем лоадер, пока не сработает редирект выше
    if (accessToken) {
        return (
            <div className={styles.card}>
                <h1 className={styles.title}>Redirecting...</h1>
                <Loader2 className={`${styles.buttonIcon} ${styles.animateSpin}`} size={24} />
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <h1 className={styles.title}>Войти через VK ID</h1>
            <p className={styles.subtitle}>
                Нажмите кнопку, чтобы начать процесс авторизации.
            </p>

            {error && (
                <div className={styles.errorBox}>
                    <AlertTriangle className={styles.errorBoxIcon} size={18} /> {error}
                </div>
            )}

            <button
                onClick={handleLogin}
                disabled={isLoading} 
                className={styles.loginButton}
            >
                {isLoading ? (
                    <Loader2 className={`${styles.buttonIcon} ${styles.animateSpin}`} size={18} />
                ) : (
                    <LogIn className={styles.buttonIcon} size={18} />
                )}
                {isLoading ? 'Перенаправление на VK ID...' : 'Войти через VK ID'}
            </button>
        </div>
    );
};

export default VKAuthStarter;