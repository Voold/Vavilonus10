import { create } from 'zustand';
import { generateFinalPrompt, fetchScenarios } from '../utils/scenariesUtils';


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

// Тип сценария для хранения (с строковым шаблоном)
export type Scenario = {
    id: string;
    name: string;
    steps: ScenarioStep[];
    finalPromptTemplate: string; // Шаблон теперь строка!
};

export type TabKey = 'finance' | 'marketing' | 'management';

export type ChatState = {
    messages: ChatMessage[];
    currentScenarioId: string | null;
    currentStepIndex: number;
    collectedParams: Record<string, string>;
    scenarios: Scenario[] | null; // Сценарии могут быть null до загрузки
    isLoading: boolean;
    isScenariosLoaded: boolean;
};

export type ChatStore = {
    finance: ChatState;
    marketing: ChatState;
    management: ChatState;
    
    // Новые методы для управления загрузкой данных
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
    scenarios: null, // Изначально null
    isLoading: false,
    isScenariosLoaded: false, // Флаг загрузки
});

const INITIAL_STORE_STATE = {
    finance: getInitialState(),
    marketing: getInitialState(),
    management: getInitialState(),
};

// --- Хранилище Zustand ---

export const useChatStore = create<ChatStore>((set, get) => ({
    ...INITIAL_STORE_STATE,

    // Метод для загрузки сценариев
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

    // Метод для получения состояния (для компонента)
    loadState: (tab:TabKey) => {
        return get()[tab];
    },

    selectScenario: (tab, scenarioId) => {
        set((state) => {
            const currentTabState = state[tab];
            const selectedScenario = currentTabState.scenarios?.find(s => s.id === scenarioId);
            
            if (!selectedScenario || currentTabState.currentScenarioId !== null) return state;

            // ... (Логика selectScenario остается прежней) ...
            
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
                    isLoading: false,
                },
            }));

        } else {
            // ЭТАПЫ ЗАВЕРШЕНЫ (ФОРМИРУЕМ ПРОМПТ И ОТПРАВЛЯЕМ)

            // !!! ИСПОЛЬЗУЕМ УТИЛИТУ ДЛЯ ГЕНЕРАЦИИ ПРОМПТА !!!
            const finalPrompt = generateFinalPrompt(currentScenario.finalPromptTemplate, updatedParams);
            
            setTimeout(() => {
                const finalModelResponse: ChatMessage = {
                    id: Date.now() + 3,
                    role: 'model',
                    content: `[СИМУЛЯЦИЯ ОТВЕТА МОДЕЛИ]\n\n**Итоговый промпт:** \`${finalPrompt}\`\n\n**Собранные параметры:** ${JSON.stringify(updatedParams)}\n\n*Для реального ответа здесь был бы ответ с сервера.*`,
                };

                set((s) => ({
                    ...s,
                    [tab]: {
                        ...currentTabState,
                        messages: [...currentTabState.messages, finalModelResponse], // Добавляем только ответ модели, сообщение пользователя уже добавлено ниже
                        currentScenarioId: null, 
                        currentStepIndex: 0,
                        collectedParams: {},
                        isLoading: false, 
                    },
                }));
            }, 1500); 

            // Сначала добавляем сообщение пользователя и включаем загрузку
            set((s) => ({
                ...s,
                [tab]: {
                    ...currentTabState,
                    messages: [...currentTabState.messages, newUserMessage], 
                    collectedParams: updatedParams,
                },
            }));
        }
    },

    resetChat: (tab) => {
        const state = get();
        // При сбросе сохраняем загруженные сценарии
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