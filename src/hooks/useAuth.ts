import { useState } from 'react';

type User = {
    id: string;
    username: string;
    email: string;
    // ... другие поля профиля
};

/**
 * Хук для управления состоянием авторизации.
 * В реальном приложении здесь будет логика проверки токенов OAuth.
 */
export const useAuth = () => {
    // Для разработки установим true по умолчанию
    const [isAuthenticated, setIsAuthenticated] = useState(true); 
    const [user, setUser] = useState<User | null>({ 
        id: 'user-123', 
        username: 'TestUser', 
        email: 'test@example.com' 
    });

    // Функция для имитации входа (например, после OAuth-редиректа)
    const login = (userData: User) => {
        setIsAuthenticated(true);
        setUser(userData);
    };

    // Функция для выхода
    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        // Тут должна быть логика очистки токенов
    };

    return { isAuthenticated, user, login, logout };
};