// ChatComponent.tsx (Обновленная версия)

import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import type { Scenario, TabKey } from '../../store/useChatStore';
import styles from '../../styles/ChatComponent.module.css';

// Имитация хука для получения текущей вкладки из URL
const useTabKeyFromUrl = (): TabKey => 'finance'; 

// Компонент кнопок для выбора сценария (Без изменений)
const ScenarioSelection: React.FC<{ scenarios: Scenario[], selectScenario: (id: string) => void }> = ({ scenarios, selectScenario }) => {
    return (
        <div className={styles.menuSection}>
            {scenarios.map((scenario) => (
                <div 
                    key={scenario.id} 
                    className={styles.menuItem} 
                    onClick={() => selectScenario(scenario.id)}
                >
                    <span className={styles.itemLabel}>{scenario.name}</span>
                </div>
            ))}
        </div>
    );
};

// Главный компонент чата
const ChatComponent: React.FC = () => {
    const tabKey = useTabKeyFromUrl(); 
    
    // Получаем состояние и методы
    const { 
        messages, 
        currentScenarioId, 
        scenarios, 
        isLoading,
        isScenariosLoaded, // Новый флаг
        currentStepIndex
    } = useChatStore(state => state.loadState(tabKey));
    
    const selectScenario = useChatStore(state => state.selectScenario);
    const handleUserMessage = useChatStore(state => state.handleUserMessage);
    const resetChat = useChatStore(state => state.resetChat);
    const loadScenarios = useChatStore(state => state.loadScenarios); // Новый метод

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Эффект для асинхронной загрузки сценариев
    useEffect(() => {
        if (!isScenariosLoaded) {
            loadScenarios(tabKey);
        }
    }, [tabKey, isScenariosLoaded, loadScenarios]);

    // Скролл к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() === '' || isLoading) return;

        handleUserMessage(tabKey, input.trim());
        setInput('');
    };

    const handleSelectScenario = (scenarioId: string) => {
        selectScenario(tabKey, scenarioId);
    };

    const isChatActive = currentScenarioId !== null;
    const isScenarioSelectionPhase = isScenariosLoaded && messages[0].isScenarioSelection && currentScenarioId === null;
    
    // Получение текущего шага
    const currentScenario = scenarios?.find( (s: any) => s.id === currentScenarioId);
    const currentStep = currentScenario?.steps[currentStepIndex];
    const currentPrompt = currentStep?.modelPrompt || '';

    // Отображение заглушки, пока сценарии не загружены
    if (!isScenariosLoaded) {
        return <div className={styles.chatWrapper}>Загрузка сценариев для {tabKey}...</div>;
    }

    return (
        <div className={styles.chatWrapper}>
            <button className={styles.resetButton} onClick={() => resetChat(tabKey)}>
                Сбросить чат
            </button>

            <div className={styles.messagesContainer}>
                {messages.map((msg:any) => (
                    <div
                        key={msg.id}
                        className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.modelMessage}`}
                    >
                        {msg.content}
                        {/* Показываем кнопки выбора сценария, только если это первое сообщение и сценарии загружены */}
                        {msg.isScenarioSelection && scenarios && (
                            <ScenarioSelection 
                                scenarios={scenarios} 
                                selectScenario={handleSelectScenario} 
                            />
                        )}
                    </div>
                ))}
                
                {isLoading && (
                    <div className={styles.loadingIndicator}>... модель думает ...</div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            <form className={styles.inputSection} onSubmit={handleSend}>
                <input
                    type="text"
                    className={styles.chatInput}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                        isChatActive
                        ? `Введите ${currentStep?.paramName || 'параметр'}: ${currentPrompt}`
                        : isScenarioSelectionPhase
                            ? "Выберите сценарий выше, чтобы начать."
                            : "Сценарий завершен. Сбросьте чат, чтобы начать новый."
                    }
                    disabled={!isChatActive || isLoading}
                />
                <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={!isChatActive || isLoading || input.trim() === ''}
                >
                    Отправить
                </button>
            </form>
        </div>
    );
};

export default ChatComponent;