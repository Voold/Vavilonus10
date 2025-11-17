import { create } from 'zustand';
// Импортируем только то, что нужно для общения с моделью
import { getOllamaResponse } from '../api/ollamaApi'; 

// --- ТИПЫ (Упрощены, но совместимы с ChatMessage) ---

export type ChatMessage = {
    id: number;
    role: 'user' | 'model';
    content: string;
};

export type TabKey = 'finance' | 'marketing' | 'management';

export type FreeChatState = {
    messages: ChatMessage[];
    isLoading: boolean;
    // Оставляем флаг isInitialized, чтобы показать первое сообщение только один раз
    isInitialized: boolean; 
};

export type FreeChatStore = {
    // Хранение состояния по вкладкам (как и раньше)
    finance: FreeChatState;
    marketing: FreeChatState;
    management: FreeChatState;
    
    // Методы
    loadState: (tab: TabKey) => FreeChatState;
    // Основной метод для обработки сообщений
    handleUserMessage: (tab: TabKey, userMessage: string) => void; 
    resetChat: (tab: TabKey) => void;
};

// --- Инициализация состояния ---

const getInitialState = (): FreeChatState => ({
    messages: [
        { 
            id: 1, 
            role: 'model', 
            content: 'Здравствуйте, я ваш AI-помощник. Введите любой вопрос.', 
        }
    ],
    isLoading: false,
    isInitialized: true,
});

const INITIAL_STORE_STATE: Record<TabKey, FreeChatState> = {
    finance: getInitialState(),
    marketing: getInitialState(),
    management: getInitialState(),
};

// --- Хранилище Zustand ---

export const useFreeChatStore = create<FreeChatStore>((set, get) => ({
    ...INITIAL_STORE_STATE,

    loadState: (tab: TabKey): FreeChatState => {
        return get()[tab];
    },

    // >>> ГЛАВНЫЙ МЕТОД: Свободный чат <<<
    handleUserMessage: (tab, userMessage) => {
        const state = get();
        const currentTabState = state[tab];
        
        // Предотвращаем отправку, если уже идет загрузка
        if (currentTabState.isLoading) {
            return;
        }

        const newUserMessage: ChatMessage = {
            id: Date.now() + 1,
            role: 'user',
            content: userMessage,
        };
        
        // 1. Обновляем состояние: добавляем сообщение пользователя и включаем загрузку
        set((s) => ({
            ...s,
            [tab]: {
                ...currentTabState,
                messages: [...currentTabState.messages, newUserMessage], 
                isLoading: true,
            },
        }));
        
        // 2. Асинхронный вызов Ollama API
        getOllamaResponse(userMessage) 
            .then((modelResponse) => {
                const finalModelResponse: ChatMessage = {
                    id: Date.now() + 2,
                    role: 'model',
                    content: modelResponse, 
                };
                
                // Добавляем ответ модели
                set((s) => ({
                    ...s,
                    [tab]: {
                        ...s[tab], // Берем актуальное состояние
                        messages: [...s[tab].messages, finalModelResponse], 
                        isLoading: false, // Выключаем загрузку
                    },
                }));
            })
            .catch((error) => {
                // Обработка ошибки
                const errorMessage: ChatMessage = {
                    id: Date.now() + 2,
                    role: 'model',
                    content: `Произошла ошибка при получении ответа от Ollama: ${error.message || 'Неизвестная ошибка'}.`,
                };
                
                // Добавляем сообщение об ошибке
                set((s) => ({
                    ...s,
                    [tab]: {
                        ...s[tab],
                        messages: [...s[tab].messages, errorMessage],
                        isLoading: false,
                    },
                }));
            });
    },

    resetChat: (tab) => {
        set((s) => ({
            ...s,
            [tab]: getInitialState(),
        }));
    },
}));