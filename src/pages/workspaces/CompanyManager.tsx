import React, { useEffect, useState } from 'react';
import { useCompanyStore} from '../../store/companyStore';
/* import type { Chat } from '../../store/companyStore'; */
import type {  Chat, } from '../../utils/companyService'; 

// Заглушка для компонента чата, который мы определим позже
const SimpleChat: React.FC<{ companyId: string, chat: Chat }> = ({ chat }) => (
    <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '10px' }}>
        <p>Начало чата: **{chat.title}** (Тип: {chat.type})</p>
    </div>
);


const CompanyManager: React.FC = () => {
    // Получаем состояние и действия из Zustand
    const {
        companies,
        selectedCompany,
        companyChats,
        companyDocuments,
        isLoading,
        error,
        fetchCompanies,
        createCompany,
        /* selectCompany, */
        clearSelection,
        fetchUserChats,
        fetchCompanyDocuments,
        // ... другие действия
    } = useCompanyStore();

    // Заглушка для ID текущего пользователя (должен быть в реальном приложении)
    const CURRENT_USER_ID = 'user-123';

    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyDescription, setNewCompanyDescription] = useState('');
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

    // Загрузка списка компаний при монтировании
    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    // Загрузка чатов и документов при выборе компании
    useEffect(() => {
        if (selectedCompany) {
            fetchUserChats(selectedCompany.id, CURRENT_USER_ID);
            fetchCompanyDocuments(selectedCompany.id);
        }
    }, [selectedCompany, fetchUserChats, fetchCompanyDocuments]);

    const handleCreateCompany = () => {
        if (newCompanyName && newCompanyDescription) {
            createCompany(newCompanyName, newCompanyDescription);
            setNewCompanyName('');
            setNewCompanyDescription('');
        }
    };
    
    // Функция для создания нового чата
    const handleCreateChat = () => {
        if (selectedCompany) {
            useCompanyStore.getState().createChat(
                selectedCompany.id,
               /*  CURRENT_USER_ID, */
                'helper', // По умолчанию
                `Новый чат ${companyChats.length + 1}`
            );
        }
    };


    if (isLoading && !selectedCompany && companies.length === 0) {
        return <p>⏳ Загрузка компаний...</p>;
    }

    return (
        <div style={{ padding: '20px', color: 'white',fontFamily: 'Arial, sans-serif' }}>
            <h1>🏢 Управление Компаниями</h1>
            
            {error && <p style={{ color: 'red' }}>🛑 Ошибка: {error}</p>}
            
            <hr />
            
            {/* --- Создание новой компании --- */}
            <h2>➕ Создать Компанию</h2>
            <input
                type="text"
                placeholder="Название компании"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                style={{ margin: '5px', padding: '8px' }}
            />
            <input
                type="text"
                placeholder="Описание компании"
                value={newCompanyDescription}
                onChange={(e) => setNewCompanyDescription(e.target.value)}
                style={{ margin: '5px', padding: '8px' }}
            />
            <button 
                onClick={handleCreateCompany} 
                disabled={!newCompanyName || !newCompanyDescription || isLoading}
                style={{ padding: '10px', backgroundColor: 'green', color: 'white', border: 'none', cursor: 'pointer' }}
            >
                {isLoading ? 'Создание...' : 'Создать'}
            </button>
            
            <hr />

            {/* --- Список компаний --- */}
            <h2>📋 Список Компаний</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>

                {companies?.map((company) => (
                    <button
                        key={company.id}
                        /* onClick={() => selectedCompany(company.id)} */
                        style={{
                            padding: '10px 15px',
                            cursor: 'pointer',
                            border: `2px solid ${selectedCompany?.id === company.id ? 'darkblue' : '#ccc'}`,
                            backgroundColor: selectedCompany?.id === company.id ? '#e6f0ff' : 'white',
                            borderRadius: '5px',
                            fontWeight: selectedCompany?.id === company.id ? 'bold' : 'normal',
                        }}
                    >
                        {company.name} (ID: {company.id})
                    </button>
                ))}
            </div>

            <hr />

            {/* --- Детали выбранной компании --- */}
            {selectedCompany ? (
                <div>
                    <h2>ℹ️ Детали Компании: **{selectedCompany.name}**</h2>
                    <p>ID: `{selectedCompany.id}`</p>
                    <p>Описание: {selectedCompany.description}</p>
                    <button onClick={clearSelection} style={{ margin: '5px', padding: '8px' }}>
                        &larr; Выбрать другую
                    </button>
                    <button onClick={() => alert('Начало процесса добавления контекста')} style={{ margin: '5px', padding: '8px' }}>
                        ➕ Добавить Контекст (POST /context/)
                    </button>
                    
                    <div style={{ display: 'flex', marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                        
                        {/* --- Документы --- */}
                        <div style={{ flex: 1, paddingRight: '15px', borderRight: '1px solid #eee' }}>
                            <h3>📄 Документы ({companyDocuments.length})</h3>
                            <button onClick={() => alert('Открытие диалога загрузки')} style={{ marginBottom: '10px' }}>
                                ⬆️ Загрузить Документ
                            </button>
                            <ul>
                                {companyDocuments.map((doc, index) => (
                                    <li key={index} style={{ marginBottom: '5px' }}>
                                        {doc.filename}
                                        <button 
                                            onClick={() => useCompanyStore.getState().downloadDocument(selectedCompany.id, doc.filename)} 
                                            style={{ marginLeft: '10px', fontSize: '12px', padding: '3px 8px' }}
                                        >
                                            Скачать
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        {/* --- Чаты --- */}
                        <div style={{ flex: 2, paddingLeft: '15px' }}>
                            <h3>💬 Чаты Пользователя ({CURRENT_USER_ID}) ({companyChats.length})</h3>
                            <button onClick={handleCreateChat} style={{ marginBottom: '10px' }}>
                                ➕ Создать Новый Чат
                            </button>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {companyChats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            border: `1px solid ${selectedChat?.id === chat.id ? 'green' : 'gray'}`,
                                            backgroundColor: selectedChat?.id === chat.id ? '#e6ffe6' : '#f9f9f9',
                                            borderRadius: '3px',
                                        }}
                                    >
                                        {chat.title} ({chat.type})
                                    </button>
                                ))}
                            </div>
                            
                            {/* --- Компонент Чата (открывается при выборе) --- */}
                            {selectedChat && (
                                <div style={{ marginTop: '20px', border: '2px solid green', padding: '15px', borderRadius: '5px' }}>
                                    <h3>🚀 Чат: {selectedChat.title}</h3>
                                    <SimpleChat companyId={selectedCompany.id} chat={selectedChat} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <p>💡 Выберите компанию выше, чтобы просмотреть детали, чаты и документы.</p>
            )}
        </div>
    );
};

export default CompanyManager;