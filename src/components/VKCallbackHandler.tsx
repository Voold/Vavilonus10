import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore'; 
import { vkExchange } from '../api/authAPI'; // Использует localStorage

const VKCallbackHandler: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setLoading, setTokens, setUser, clearAuth } = useAuthStore();
    
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        const exchangeCode = async () => {
            if (!code || !state) {
                // VK не вернул код - ошибка или отмена
                console.error("Missing 'code' or 'state' in callback URL.");
                navigate('/vk_oauth', { replace: true });
                return;
            }

            setLoading(true);

            try {
                // Обмен кода на JWT. vkExchange использует PKCE data из localStorage
                const authData = await vkExchange(code, state);
                
                // Установка данных в Zustands store
                setTokens(authData.access_token, authData.refresh_token);
                setUser(authData.user);
                
                // Успешный редирект на защищенную страницу
                navigate('/home', { replace: true });
            } catch (e) {
                console.error("VK Token Exchange failed:", e);
                clearAuth();
                // В случае ошибки возвращаемся на страницу логина
                navigate('/vk_oauth', { state: { error: 'Auth failed' }, replace: true });
            } finally {
                setLoading(false);
            }
        };

        exchangeCode();
    }, [location.search, navigate, setTokens, setUser, setLoading, clearAuth]);

    // Промежуточный экран загрузки
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white shadow-xl rounded-lg text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-indigo-500 animate-spin" />
                <h1 className="text-xl font-semibold text-gray-700">Авторизация VK ID...</h1>
                <p className="text-sm text-gray-500 mt-2">
                    Обмен кода на токены. Пожалуйста, подождите.
                </p>
            </div>
        </div>
    );
};

export default VKCallbackHandler;