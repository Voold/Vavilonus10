/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
// ⭐ ИСПРАВЛЕНИЕ: Используем НОВОЕ хранилище для свободного чата
import { useFreeChatStore } from '../../store/useFreeChatStore'; 
import type { TabKey, ChatMessage } from '../../store/useFreeChatStore';
import styles from '../../styles/ChatComponent.module.css'; // Используем существующие стили

// Имитация хука для получения текущей вкладки из URL
const useTabKeyFromUrl = (): TabKey => 'finance'; 

// ----------------------------------------------------------------
// Компонент: Рендеринг содержимого сообщения с Markdown
// ----------------------------------------------------------------
const MessageContent: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
    // Применяем Markdown только к сообщениям от модели
    if (msg.role === 'model') {
        return <ReactMarkdown>{msg.content}</ReactMarkdown>;
    }
    
    // Для сообщений пользователя используем обычный текст
    return <>{msg.content}</>;
}


// ----------------------------------------------------------------
// Главный компонент чата
// ----------------------------------------------------------------
const ChatWorkspace: React.FC = () => {
    const tabKey = useTabKeyFromUrl(); 
    
    // ⭐ ИСПРАВЛЕНИЕ: Получаем состояние и методы из useFreeChatStore
    const { 
        messages, 
        isLoading,
        isInitialized, // Используем для проверки готовности чата
    } = useFreeChatStore(state => state.loadState(tabKey)); 
    
    const handleUserMessage = useFreeChatStore(state => state.handleUserMessage);
    const resetChat = useFreeChatStore(state => state.resetChat);

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Скролл к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        
        // isChatActive проверяет, что чат инициализирован.
        if (input.trim() === '' || isLoading || !isChatActive) return; 

        handleUserMessage(tabKey, input.trim());
        setInput('');
    };

    // ⭐ ИСПРАВЛЕНИЕ: Чат активен, если хранилище инициализировано (что происходит сразу в FreeChatStore)
    const isChatActive = isInitialized; 

    // Заглушка, если инициализация еще не произошла
    if (!isInitialized) {
        return <div className={styles.chatWrapper}>Инициализация чата...</div>;
    }

    return (
        <div className={styles.chatWrapper}>
            <button className={styles.resetButton} onClick={() => resetChat(tabKey)}>
                Сбросить чат
            </button>

            <div className={styles.messagesContainer}>
                {messages
                    // В FreeChatStore нет isScenarioSelection, но мы оставляем .filter на всякий случай, 
                    // если вы переиспользуете типы из старого хранилища.
                    .filter(msg => !(msg as any).isScenarioSelection) 
                    .map((msg: ChatMessage) => (
                        <div
                            key={msg.id}
                            className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.modelMessage}`}
                        >
                            <MessageContent msg={msg} />
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
                        ? "Введите ваше сообщение здесь..."
                        : "Чат не активен."
                    }
                    disabled={!isChatActive || isLoading}
                />
                <button
                    type="submit"
                    className={styles.sendButton}
                    // Условие блокировки: неактивен ИЛИ загрузка ИЛИ пустое поле
                    disabled={!isChatActive || isLoading || input.trim() === ''}
                >
                    Отправить
                </button>
            </form>
        </div>
    );
};

export default ChatWorkspace;