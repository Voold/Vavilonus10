import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import styles from '../styles/AuthPage.module.css'; 
// Предполагаем, что useAuthStore и типы импортированы корректно
import { useAuthStore } from '../store/useAuthStore';

// Mock-типы для корректной компиляции, если не импортированы глобально
// В реальном проекте эти типы должны быть импортированы из authAPI.ts
type UserBase = { full_name: string; inn: number; role?: string };
type LoginData = { inn: number; password: string };


/**
 * Компонент страницы входа и регистрации.
 * Использует Zustand для управления состоянием и API-вызовами.
 */
export const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    // Состояние для переключения между "Вход" и "Регистрация"
    const [isRegisterMode, setIsRegisterMode] = useState(false); 
    
    // Локальное состояние формы
    const [formData, setFormData] = useState({ 
        inn: '', 
        fullName: '', 
        password: '',
        role: ''
    });

    // --- ИСПРАВЛЕНИЕ: Безопасное извлечение состояния из Zustand ---
    // Извлекаем каждый элемент отдельно, чтобы избежать создания нового объекта в селекторе.
    const isLoggedIn = useAuthStore((state) => state.user.isLoggedIn);
    const isLoading = useAuthStore((state) => state.isLoading);
    const error = useAuthStore((state) => state.error);
    const createUser = useAuthStore((state) => state.createUser);
    const loginUser = useAuthStore((state) => state.loginUser);
    const setError = useAuthStore((state) => state.setError);
    // -----------------------------------------------------------------

    // Эффект для перенаправления, если пользователь уже авторизован
    // Теперь зависит только от примитива isLoggedIn, что безопасно.
    useEffect(() => {
        if (isLoggedIn) {
            navigate('/dashboard', { replace: true });
        }
    }, [isLoggedIn, navigate]);
    
    // Сброс ошибки при смене режима
    useEffect(() => {
        setError(null);
    }, [isRegisterMode, setError]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError(null); 
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); 

        // 1. Проверка обязательных полей
        if (!formData.inn || !formData.password) {
            setError('ИНН и Пароль обязательны.');
            return;
        }

        const innNum = parseInt(formData.inn, 10);
        if (isNaN(innNum)) {
            setError('ИНН должен быть числом.');
            return;
        }

        try {
            if (isRegisterMode) {
                // Логика Регистрации (createUser)
                if (!formData.fullName) {
                    setError('ФИО обязательно для регистрации.');
                    return;
                }

                const userData: UserBase = {
                    full_name: formData.fullName,
                    inn: innNum,
                    role: formData.role || undefined, 
                };
                
                await createUser(userData);

                // Оповещение и переключение на Вход
                alert('Регистрация прошла успешно! Теперь войдите в систему.');
                setIsRegisterMode(false);

            } else {
                // Логика Входа (loginUser)
                const loginData: LoginData = {
                    inn: innNum,
                    password: formData.password,
                };
                
                await loginUser(loginData);

                // Если успешно, перенаправляем (произойдет через useEffect)
            }
        } catch (err) {
            // Ошибка уже установлена в хранилище Zustand
            console.error(err);
        }
    };
    
    // --- Компонент формы для режимов Входа/Регистрации ---
    const AuthForm = (
        <form onSubmit={handleSubmit} className={styles.authForm}>
            
            {/* Поле ФИО (только для регистрации) */}
            {isRegisterMode && (
                <input
                    type="text"
                    name="fullName"
                    placeholder="ФИО (Полное имя)"
                    value={formData.fullName}
                    onChange={handleChange}
                    required={isRegisterMode}
                    className={styles.inputField}
                />
            )}

            {/* Поле ИНН */}
            <input
                type="text"
                name="inn"
                placeholder="ИНН (Идентификатор)"
                value={formData.inn}
                onChange={handleChange}
                required
                className={styles.inputField}
                pattern="\d*" 
                maxLength={12}
            />

            {/* Поле Пароль */}
            <input
                type="password"
                name="password"
                placeholder="Пароль"
                value={formData.password}
                onChange={handleChange}
                required
                className={styles.inputField}
            />
            
            {/* Поле Роль (опционально для регистрации) */}
            {isRegisterMode && (
                <input
                    type="text"
                    name="role"
                    placeholder="*Роль (Например, 'Manager') [Опционально]"
                    value={formData.role}
                    onChange={handleChange}
                    className={styles.inputField}
                />
            )}

            {/* Кнопка отправки */}
            <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
            >
                {isLoading ? (
                    'Загрузка...'
                ) : isRegisterMode ? (
                    <><UserPlus size={18} /><span>Зарегистрироваться</span></>
                ) : (
                    <><LogIn size={18} /><span>Войти в систему</span></>
                )}
            </button>
        </form>
    );

    return (
        <div className={styles.pageContainer}>
            <div className={styles.authCard}>
                
                {/* Заголовок и Иконка */}
                <div className={styles.header}>
                    <div className={styles.titleBlock}>
                      {isRegisterMode ? 
                        <UserPlus size={48} className={styles.icon}/> : 
                        <LogIn size={48} className={styles.icon}/>
                      }
                      <h2 className={styles.title}>
                          {isRegisterMode ? 'Регистрация' : 'Вход'}
                      </h2>
                    </div>
                    <p className={styles.subtitle}>
                        {isRegisterMode 
                            ? 'Создайте новую учетную запись.' 
                            : 'Пожалуйста, авторизуйтесь для доступа к рабочему пространству.'
                        }
                    </p>
                </div>

                {/* Блок ошибок */}
                {error && (
                    <div className={styles.errorBox}>
                        <AlertTriangle size={20} style={{ minWidth: '20px' }}/>
                        <p>{error}</p>
                    </div>
                )}

                {/* Форма */}
                {AuthForm}
                
                

                {/* Переключатель режимов */}
                <p className={styles.switchText}>
                    {isRegisterMode ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
                    <button 
                        type="button"
                        onClick={() => {
                            setIsRegisterMode(prev => !prev);
                        }}
                        className={styles.switchButton}
                    >
                        {isRegisterMode ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                </p>

            </div>
        </div>
    );
};