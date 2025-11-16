// src/api/api.ts

import axios from 'axios';
import type { AxiosInstance } from 'axios';

// Используем ваш базовый URL
export const API_BASE_URL = 'https://vavilonus10.ru/api';

/**
 * 💡 Адаптер Axios для публичных запросов (логин/регистрация)
 */
export const publicApi: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * 💡 Адаптер Axios для авторизованных запросов
 * Использует интерцептор для добавления токена.
 */
export const protectedApi: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Интерцептор запросов для добавления токена
protectedApi.interceptors.request.use(
    (config) => {
        // Получаем токен из localStorage или другого хранилища
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);