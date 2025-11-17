// useChatStore.ts

import { create } from 'zustand';
// Убедитесь, что эти импорты корректны для ваших утилит
import { generateFinalPrompt, fetchScenarios } from '../utils/scenariesUtils'; 
// >>> ИМПОРТ ОБНОВЛЕННОЙ УТИЛИТЫ API <<<
import { getOllamaResponse } from '../api/ollamaApi'; // <-- ИЗМЕНЕНО: используем Ollama

// --- ТИПЫ (НЕ ИЗМЕНЕНЫ) ---

export type ChatMessage = {
    id: number;
    role: 'user' | 'model';
    content: string;
    isScenarioSelection?: boolean;
};

export type ScenarioStep = {
    modelPrompt: string;
    paramName: string;
};

export type Scenario = {
    id: string;
    name: string;
    steps: ScenarioStep[];
    finalPromptTemplate: string; // Шаблон теперь строка
};

export type TabKey = 'finance' | 'marketing' | 'management' | 'legal';

export type ChatState = {
    messages: ChatMessage[];
    currentScenarioId: string | null;
    currentStepIndex: number;
    collectedParams: Record<string, string>;
    scenarios: Scenario[] | null; 
    isLoading: boolean;
    isScenariosLoaded: boolean;
};

export type ChatStore = {
    finance: ChatState;
    marketing: ChatState;
    management: ChatState;
    legal: ChatState;
    
    // Методы
    loadScenarios: (tab: TabKey) => Promise<void>;
    loadState: (tab: TabKey) => ChatState;
    selectScenario: (tab: TabKey, scenarioId: string) => void;
    handleUserMessage: (tab: TabKey, userMessage: string) => void; 
    resetChat: (tab: TabKey) => void;
};

// --- Инициализация состояния ---

const getInitialState = (): ChatState => ({
    messages: [
        { 
            id: 1, 
            role: 'model', 
            content: 'Здравствуйте, выберите задачу', 
            isScenarioSelection: true 
        }
    ],
    currentScenarioId: null,
    currentStepIndex: 0,
    collectedParams: {},
    scenarios: null, 
    isLoading: false,
    isScenariosLoaded: false, 
});

const INITIAL_STORE_STATE = {
    finance: getInitialState(),
    marketing: getInitialState(),
    management: getInitialState(),
    legal: getInitialState(),
};

// --- Хранилище Zustand ---

export const useChatStore = create<ChatStore>((set, get) => ({
    ...INITIAL_STORE_STATE,

    loadScenarios: async (tab) => {
        const currentTabState = get()[tab];
        if (currentTabState.isScenariosLoaded) return;

        set((state) => ({ 
            ...state, 
            [tab]: { 
                ...currentTabState, 
                isLoading: true 
            } 
        }));

        // Предполагается, что fetchScenarios - асинхронная функция
        const scenariosData: Scenario[] = await fetchScenarios(tab);

        set((state) => ({
            ...state,
            [tab]: {
                ...currentTabState,
                scenarios: scenariosData,
                isLoading: false,
                isScenariosLoaded: true,
            },
        }));
    },

    loadState: (tab:TabKey) => {
        return get()[tab];
    },

    selectScenario: (tab, scenarioId) => {
        set((state) => {
            const currentTabState = state[tab];
            const selectedScenario = currentTabState.scenarios?.find(s => s.id === scenarioId);
            
            if (!selectedScenario || currentTabState.currentScenarioId !== null) return state;
            
            const userSelectionMessage: ChatMessage = {
                id: Date.now() + 1,
                role: 'user',
                content: `Выбран сценарий: ${selectedScenario.name}`,
            };

            const firstStep = selectedScenario.steps[0];
            const modelPromptMessage: ChatMessage = {
                id: Date.now() + 2,
                role: 'model',
                content: firstStep.modelPrompt,
            };

            return {
                ...state,
                [tab]: {
                    ...currentTabState,
                    messages: [...currentTabState.messages, userSelectionMessage, modelPromptMessage],
                    currentScenarioId: scenarioId,
                    currentStepIndex: 0,
                    collectedParams: {},
                },
            };
        });
    },

    // >>> ИЗМЕНЕННЫЙ МЕТОД handleUserMessage <<<
    handleUserMessage: (tab, userMessage) => {
        const state = get();
        const currentTabState = state[tab];
        
        if (currentTabState.currentScenarioId === null || currentTabState.isLoading || !currentTabState.scenarios) {
            return;
        }

        const currentScenario = currentTabState.scenarios.find(
            s => s.id === currentTabState.currentScenarioId
        );

        if (!currentScenario) return;

        // Временно включаем isLoading и добавляем сообщение пользователя
        set((s) => ({
            ...s,
            [tab]: {
                ...currentTabState,
                isLoading: true,
            }
        }));

        const currentStep = currentScenario.steps[currentTabState.currentStepIndex];
        const nextStepIndex = currentTabState.currentStepIndex + 1;
        
        const newUserMessage: ChatMessage = {
            id: Date.now() + 1,
            role: 'user',
            content: userMessage,
        };
        
        const updatedParams = {
            ...currentTabState.collectedParams,
            [currentStep.paramName]: userMessage,
        };

        if (nextStepIndex < currentScenario.steps.length) {
            // ЕЩЕ ЕСТЬ ЭТАПЫ (СЛЕДУЮЩИЙ ВОПРОС)
            
            const nextStep = currentScenario.steps[nextStepIndex];
            const nextModelMessage: ChatMessage = {
                id: Date.now() + 2,
                role: 'model',
                content: nextStep.modelPrompt,
            };

            set((s) => ({
                ...s,
                [tab]: {
                    ...currentTabState,
                    messages: [...currentTabState.messages, newUserMessage, nextModelMessage],
                    currentStepIndex: nextStepIndex,
                    collectedParams: updatedParams,
                    isLoading: false, // Выключаем загрузку, так как это просто следующий шаг
                },
            }));

        } else {
            // ЭТАПЫ ЗАВЕРШЕНЫ (ФОРМИРУЕМ ПРОМПТ И ОТПРАВЛЯЕМ)

            const finalPrompt = generateFinalPrompt(currentScenario.finalPromptTemplate, updatedParams);
            
            // 1. Добавляем сообщение пользователя в чат и подтверждаем, что загрузка началась
            set((s) => ({
                ...s,
                [tab]: {
                    ...currentTabState,
                    messages: [...currentTabState.messages, newUserMessage], 
                    collectedParams: updatedParams,
                    isLoading: true, // Убеждаемся, что индикатор загрузки включен
                },
            }));
            
            // 2. Асинхронный вызов Ollama API (ВМЕСТО DeepSeek)
            getOllamaResponse(finalPrompt) // <-- ИЗМЕНЕНИЕ: getOllamaResponse
                .then((modelResponse) => {
                    const finalModelResponse: ChatMessage = {
                        id: Date.now() + 3,
                        role: 'model',
                        content: modelResponse, 
                    };
                    
                    set((s) => ({
                        ...s,
                        [tab]: {
                            ...s[tab], // Берем актуальное состояние, чтобы не потерять другие обновления
                            messages: [...s[tab].messages, finalModelResponse], 
                            currentScenarioId: null, // Завершаем сценарий
                            currentStepIndex: 0,
                            collectedParams: {},
                            isLoading: false, // Выключаем загрузку
                        },
                    }));
                })
                .catch((error) => {
                    // Обработка ошибки
                    const errorMessage: ChatMessage = {
                        id: Date.now() + 3,
                        role: 'model',
                        content: `Произошла ошибка при получении ответа от Ollama: ${error.message || 'Неизвестная ошибка'}.`, // <-- ИЗМЕНЕНИЕ: Название ошибки
                    };
                    
                    set((s) => ({
                        ...s,
                        [tab]: {
                            ...s[tab],
                            messages: [...s[tab].messages, errorMessage],
                            isLoading: false,
                        },
                    }));
                });
        }
    },

    resetChat: (tab) => {
        const state = get();
        const currentScenarios = state[tab].scenarios; 
        set((s) => ({
            ...s,
            [tab]: {
                ...getInitialState(),
                scenarios: currentScenarios,
                isScenariosLoaded: true,
            },
        }));
    },
}));