import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '../../store/companyStore'; // Импортируем тип Chat

// Тип для сообщения
interface Message {
    id: number;
    text: string;
    sender: 'user' | 'model';
    timestamp: Date;
}

interface SimpleChatProps {
    companyId: string;
    chat: Chat;
}

const SimpleChat: React.FC<SimpleChatProps> = ({ companyId, chat }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    
    const socketRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Эффект для прокрутки к последнему сообщению
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    // Эффект для управления WebSocket-соединением
    useEffect(() => {
        // Заглушка: в реальном приложении нужно преобразовать HTTP в WS (ws:// или wss://)
        const WS_URL = `ws://your-websocket-server/api/companies/${companyId}/ws/chats/${chat.id}?user_id=${chat.user_id}`;
        
        // Закрываем предыдущее соединение, если оно есть
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        try {
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                console.log('WebSocket Connected:', WS_URL);
                setIsConnected(true);
                setMessages([]); // Очищаем историю при переключении чата
                // В реальном приложении здесь можно запросить историю чата
            };

            ws.onmessage = (event) => {
                // Предполагаем, что получаем текст
                const modelResponse: string = event.data;
                setMessages(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    text: modelResponse,
                    sender: 'model',
                    timestamp: new Date()
                }]);
            };

            ws.onclose = () => {
                console.log('WebSocket Disconnected');
                setIsConnected(false);
            };

            ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setIsConnected(false);
            };

            socketRef.current = ws;
            
        } catch {
            console.error("Failed to connect to WebSocket, using fallback.");
            setIsConnected(false);
        }

        // Очистка при размонтировании или смене chat/companyId
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [companyId, chat.id, chat.user_id]);

    // Отправка сообщения
    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !isConnected) return;
        
        const newMessage: Message = {
            id: Date.now(),
            text: input.trim(),
            sender: 'user',
            timestamp: new Date()
        };
        
        // 1. Отображаем сообщение пользователя
        setMessages(prev => [...prev, newMessage]);
        
        // 2. Отправляем через WebSocket
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(input.trim());
        } else {
            // Fallback для имитации ответа модели
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: `*Симуляция ответа модели:* Я обработал ваш запрос: "${input.trim()}"`,
                    sender: 'model',
                    timestamp: new Date()
                }]);
            }, 500);
        }
        
        setInput('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '400px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f4f4f4', borderBottom: '1px solid #ddd' }}>
                Чат: **{chat.title}** | Статус: {isConnected ? <span style={{ color: 'green' }}>🟢 Подключено</span> : <span style={{ color: 'red' }}>🔴 Отключено</span>}
                <button 
                    onClick={() => useCompanyStore.getState().exportChatHistory(companyId, chat.id)} 
                    style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '12px' }}
                >
                    ⬇️ Экспорт (.docx)
                </button>
            </div>
            
            {/* Область сообщений */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '15px' }}>
                {messages.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>Начните беседу!</p>}
                {messages.map((msg) => (
                    <div 
                        key={msg.id}
                        style={{
                            display: 'flex',
                            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: '10px'
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '70%',
                                padding: '10px 15px',
                                borderRadius: '15px',
                                backgroundColor: msg.sender === 'user' ? '#007bff' : '#e9e9eb',
                                color: msg.sender === 'user' ? 'white' : 'black',
                                wordWrap: 'break-word',
                                fontSize: '14px'
                            }}
                        >
                            {msg.text}
                            <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                                {msg.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            {/* Поле ввода */}
            <form onSubmit={sendMessage} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #ddd' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isConnected ? 'Введите сообщение...' : 'Ожидание подключения...'}
                    disabled={!isConnected}
                    style={{ flexGrow: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px 0 0 5px' }}
                />
                <button
                    type="submit"
                    disabled={!isConnected || !input.trim()}
                    style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0 5px 5px 0', cursor: 'pointer' }}
                >
                    Отправить
                </button>
            </form>
        </div>
    );
};

export default SimpleChat;