from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request, Query, Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from contextlib import contextmanager
from typing import Annotated
import json
import uuid
from datetime import datetime
import asyncio
import aiohttp
import logging
import os
from pathlib import Path
from typing import List

from .models import Chat, ChatMessage, ChatCreate, ChatMeta, ChatRename, Company, CompanyCreate, ContextUpdate
from .database import (
    get_company_context, update_company_context,
    get_user_chats, save_chat, load_chat, append_message_to_chat, delete_chat,
    get_company_docs_list, get_company_docs_dir, get_all_companies, save_company, load_company,
    ensure_company_directories, get_company_dir,
    rename_chat, get_all_company_chats  # Добавьте эти функции
)
from .websocket_manager import manager
from .ai_service import generate_ai_response

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Multi-Company AI Chat API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация
AI_URL = os.getenv("AI_URL", "http://ai-model:11434")

# Создаем необходимые директории
Path("static").mkdir(exist_ok=True)

# HTML страница для демонстрации
@app.get("/", response_class=HTMLResponse)
async def get_chat_demo():
    html_content = """
    <!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Company Business AI Assistant</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .app-container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
            display: flex;
            height: 90vh;
        }
        
        .sidebar {
            width: 350px;
            background: #f8f9fa;
            border-right: 1px solid #e9ecef;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .chat-header {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
            position: relative;
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .user-message {
            background: #3498db;
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 5px;
        }
        
        .model-message {
            background: white;
            color: #333;
            margin-right: auto;
            border: 1px solid #e9ecef;
            border-bottom-left-radius: 5px;
        }
        
        .message-sender {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 0.9em;
        }
        
        .user-message .message-sender {
            color: #e3f2fd;
        }
        
        .model-message .message-sender {
            color: #2c3e50;
        }
        
        .message-time {
            font-size: 0.7em;
            opacity: 0.7;
            margin-top: 5px;
            text-align: right;
        }
        
        .typing-indicator {
            color: #666;
            font-style: italic;
            padding: 10px 20px;
            background: white;
            border-radius: 18px;
            max-width: fit-content;
            margin-bottom: 15px;
            border: 1px solid #e9ecef;
            display: none;
        }
        
        .typing-indicator.active {
            display: block;
        }
        
        .chat-input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #e9ecef;
        }
        
        .chat-input {
            display: flex;
            gap: 10px;
        }
        
        .chat-input input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .chat-input input:focus {
            border-color: #3498db;
        }
        
        .chat-input button {
            padding: 12px 24px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .chat-input button:hover:not(:disabled) {
            background: #2980b9;
        }
        
        .chat-input button:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        
        .status {
            padding: 10px;
            text-align: center;
            background: #fff3cd;
            border-bottom: 1px solid #ffeaa7;
            font-size: 0.9em;
        }
        
        .status.connected {
            background: #d1edff;
            color: #0c5460;
            border-color: #bee5eb;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border-color: #f5c6cb;
        }
        
        .companies-section {
            margin-bottom: 20px;
        }
        
        .chats-section {
            margin-bottom: 20px;
        }
        
        .section-title {
            margin-bottom: 15px;
            color: #495057;
            font-size: 1.1em;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .new-company-btn, .new-chat-btn {
            width: 100%;
            padding: 12px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 15px;
            transition: background 0.3s;
        }
        
        .new-company-btn:hover, .new-chat-btn:hover {
            background: #219653;
        }
        
        .company-item, .chat-item {
            padding: 12px 15px;
            margin: 8px 0;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.3s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .company-item:hover, .chat-item:hover {
            background: #e9ecef;
        }
        
        .company-item.active, .chat-item.active {
            border-color: #3498db;
            background: #e3f2fd;
        }
        
        .company-item-info, .chat-item-info {
            flex: 1;
        }
        
        .company-item-name, .chat-item-name {
            font-weight: bold;
            color: #495057;
            margin-bottom: 5px;
        }
        
        .company-item-desc, .chat-item-type {
            font-size: 0.8em;
            color: #6c757d;
        }
        
        .chat-item-type {
            padding: 2px 8px;
            background: #e9ecef;
            border-radius: 12px;
            display: inline-block;
        }
        
        .company-item-actions, .chat-item-actions {
            display: flex;
            gap: 5px;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .company-item:hover .company-item-actions,
        .chat-item:hover .chat-item-actions {
            opacity: 1;
        }
        
        .rename-btn, .export-btn, .delete-btn {
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.3s;
        }
        
        .rename-btn:hover {
            background: #f39c12;
        }
        
        .export-btn:hover {
            background: #27ae60;
        }
        
        .delete-btn:hover {
            background: #e74c3c;
        }
        
        .docs-section {
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        
        .docs-list {
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
        }
        
        .doc-item {
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            margin: 5px 0;
            border: 1px solid #e9ecef;
            font-size: 0.9em;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .doc-actions {
            display: flex;
            gap: 5px;
        }
        
        .download-btn {
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .upload-btn {
            width: 100%;
            padding: 10px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .upload-btn:hover {
            background: #5a6268;
        }
        
        .file-input {
            display: none;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 10px 15px;
            border-radius: 8px;
            margin: 10px 0;
            border: 1px solid #f5c6cb;
        }
        
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 10px 15px;
            border-radius: 8px;
            margin: 10px 0;
            border: 1px solid #c3e6cb;
        }
        
        .chat-type-badge {
            font-size: 0.7em;
            padding: 2px 8px;
            border-radius: 10px;
            margin-left: 8px;
        }
        
        .marketing { background: #e8f5e8; color: #27ae60; }
        .management { background: #e3f2fd; color: #3498db; }
        .finance { background: #fff3e0; color: #f39c12; }
        .helper { background: #f3e5f5; color: #9b59b6; }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 15% auto;
            padding: 20px;
            border-radius: 10px;
            width: 400px;
            max-width: 90%;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6c757d;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #495057;
            font-weight: 500;
        }
        
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .user-info {
            padding: 10px;
            background: #e9ecef;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Сайдбар -->
        <div class="sidebar">
            <div class="user-info">
                <strong>Пользователь:</strong> <span id="currentUserId">demo-user-123</span>
            </div>
            
            <button class="new-company-btn" id="newCompanyBtn">
                + Новая компания
            </button>
            
            <div class="companies-section">
                <div class="section-title">
                    <span>Компании</span>
                </div>
                <div id="companiesListContainer">
                    <!-- Список компаний будет здесь -->
                </div>
            </div>
            
            <button class="new-chat-btn" id="newChatBtn" disabled>
                + Создать новый чат
            </button>
            
            <div class="chats-section">
                <div class="section-title">
                    <span>Мои чаты</span>
                </div>
                <div id="chatsListContainer">
                    <!-- Список чатов будет здесь -->
                </div>
            </div>
            
            <div class="docs-section">
                <div class="section-title">
                    <span>Документы компании</span>
                </div>
                <div class="docs-list" id="docsList">
                    <!-- Список документов будет здесь -->
                </div>
                <button class="upload-btn" id="uploadBtn" disabled>
                    📎 Загрузить документ
                </button>
                <input type="file" id="fileInput" class="file-input" accept=".docx,.xlsx,.svg,.txt,.pdf" multiple>
            </div>
        </div>
        
        <!-- Область чата -->
        <div class="chat-area">
            <div class="chat-header">
                <h1>Multi-Company Business AI Assistant</h1>
                <div id="status" class="status">Выберите компанию для начала работы</div>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                <div class="typing-indicator" id="typingIndicator">AI набирает ответ...</div>
            </div>
            
            <div class="chat-input-container">
                <div class="chat-input">
                    <input type="text" id="messageInput" placeholder="Введите ваше сообщение..." disabled>
                    <button id="sendButton" disabled>Отправить</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Модальное окно создания компании -->
    <div id="createCompanyModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Создать новую компанию</h3>
                <button class="close-btn" id="closeCompanyModalBtn">&times;</button>
            </div>
            <div class="form-group">
                <label for="companyName">Название компании:</label>
                <input type="text" id="companyName" placeholder="Введите название компании">
            </div>
            <div class="form-group">
                <label for="companyDescription">Описание компании:</label>
                <textarea id="companyDescription" placeholder="Введите описание компании" rows="3"></textarea>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" id="cancelCompanyCreateBtn">Отмена</button>
                <button class="btn btn-primary" id="confirmCompanyCreateBtn">Создать</button>
            </div>
        </div>
    </div>

    <!-- Модальное окно создания чата -->
    <div id="createChatModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Создать новый чат</h3>
                <button class="close-btn" id="closeChatModalBtn">&times;</button>
            </div>
            <div class="form-group">
                <label for="chatTitle">Название чата:</label>
                <input type="text" id="chatTitle" placeholder="Введите название чата">
            </div>
            <div class="form-group">
                <label for="chatType">Тип чата:</label>
                <select id="chatType">
                    <option value="marketing">Маркетинг</option>
                    <option value="management">Менеджмент</option>
                    <option value="finance">Финансы</option>
                    <option value="helper">Помощник</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" id="cancelChatCreateBtn">Отмена</button>
                <button class="btn btn-primary" id="confirmChatCreateBtn">Создать</button>
            </div>
        </div>
    </div>

    <!-- Модальное окно переименования чата -->
    <div id="renameChatModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Переименовать чат</h3>
                <button class="close-btn" id="closeRenameModalBtn">&times;</button>
            </div>
            <div class="form-group">
                <label for="renameChatTitle">Новое название чата:</label>
                <input type="text" id="renameChatTitle" placeholder="Введите новое название">
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" id="cancelRenameBtn">Отмена</button>
                <button class="btn btn-primary" id="confirmRenameBtn">Сохранить</button>
            </div>
        </div>
    </div>

    <script>
        // Конфигурация
        const API_BASE_URL = window.location.origin + '/api';
        const USER_ID = "demo-user-123";
        let currentCompanyId = null;
        let currentChatId = null;
        let ws = null;
        let isConnected = false;
        let currentRenamingChatId = null;

        // Элементы DOM
        const statusElement = document.getElementById('status');
        const chatMessagesElement = document.getElementById('chatMessages');
        const messageInputElement = document.getElementById('messageInput');
        const sendButtonElement = document.getElementById('sendButton');
        const companiesListContainer = document.getElementById('companiesListContainer');
        const chatsListContainer = document.getElementById('chatsListContainer');
        const newCompanyBtn = document.getElementById('newCompanyBtn');
        const newChatBtn = document.getElementById('newChatBtn');
        const typingIndicator = document.getElementById('typingIndicator');
        const docsList = document.getElementById('docsList');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        
        // Модальные окна
        const createCompanyModal = document.getElementById('createCompanyModal');
        const closeCompanyModalBtn = document.getElementById('closeCompanyModalBtn');
        const cancelCompanyCreateBtn = document.getElementById('cancelCompanyCreateBtn');
        const confirmCompanyCreateBtn = document.getElementById('confirmCompanyCreateBtn');
        const companyNameInput = document.getElementById('companyName');
        const companyDescriptionInput = document.getElementById('companyDescription');
        
        const createChatModal = document.getElementById('createChatModal');
        const closeChatModalBtn = document.getElementById('closeChatModalBtn');
        const cancelChatCreateBtn = document.getElementById('cancelChatCreateBtn');
        const confirmChatCreateBtn = document.getElementById('confirmChatCreateBtn');
        const chatTitleInput = document.getElementById('chatTitle');
        const chatTypeSelect = document.getElementById('chatType');
        
        const renameChatModal = document.getElementById('renameChatModal');
        const closeRenameModalBtn = document.getElementById('closeRenameModalBtn');
        const cancelRenameBtn = document.getElementById('cancelRenameBtn');
        const confirmRenameBtn = document.getElementById('confirmRenameBtn');
        const renameChatTitleInput = document.getElementById('renameChatTitle');

        // Инициализация при загрузке страницы
        document.addEventListener('DOMContentLoaded', async function() {
            await initializeApp();
            setupEventListeners();
        });

        // Инициализация приложения
        async function initializeApp() {
            try {
                statusElement.textContent = 'Загрузка компаний...';
                
                // Получаем список компаний
                const response = await fetch(`${API_BASE_URL}/companies`);
                if (!response.ok) {
                    throw new Error('Ошибка загрузки компаний');
                }
                
                const companies = await response.json();
                
                if (companies.length > 0) {
                    updateCompaniesList(companies);
                    statusElement.textContent = 'Выберите компанию для начала работы';
                } else {
                    companiesListContainer.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Компаний пока нет</div>';
                    statusElement.textContent = 'Создайте первую компанию';
                }
                
            } catch (error) {
                console.error('Ошибка инициализации:', error);
                showError('Ошибка загрузки: ' + error.message);
            }
        }

        // Загрузка списка документов компании
        async function loadCompanyDocs(companyId) {
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${companyId}/docs/`);
                if (response.ok) {
                    const docs = await response.json();
                    updateDocsList(docs);
                }
            } catch (error) {
                console.error('Ошибка загрузки документов:', error);
            }
        }

        // Обновление списка документов
        function updateDocsList(docs) {
            docsList.innerHTML = '';
            
            if (docs.length === 0) {
                docsList.innerHTML = '<div class="doc-item">Документов пока нет</div>';
                return;
            }
            
            docs.forEach(doc => {
                const docElement = document.createElement('div');
                docElement.className = 'doc-item';
                docElement.innerHTML = `
                    <span>${doc.name}</span>
                    <div class="doc-actions">
                        <button class="download-btn" onclick="downloadDocument('${currentCompanyId}', '${doc.name}')">Скачать</button>
                    </div>
                `;
                docsList.appendChild(docElement);
            });
        }

        // Скачивание документа
        async function downloadDocument(companyId, filename) {
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${companyId}/docs/download/${filename}`);
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    showError('Ошибка скачивания документа');
                }
            } catch (error) {
                showError('Ошибка скачивания: ' + error.message);
            }
        }

        // Обновление списка компаний
        function updateCompaniesList(companies) {
            companiesListContainer.innerHTML = '';
            
            companies.forEach(company => {
                const companyElement = document.createElement('div');
                companyElement.className = `company-item ${company.company_id === currentCompanyId ? 'active' : ''}`;
                companyElement.innerHTML = `
                    <div class="company-item-info">
                        <div class="company-item-name">${company.name}</div>
                        <div class="company-item-desc">${company.description}</div>
                    </div>
                `;
                companyElement.onclick = () => selectCompany(company.company_id);
                companiesListContainer.appendChild(companyElement);
            });
        }

        // Обновление списка чатов
        function updateChatsList(chats) {
            chatsListContainer.innerHTML = '';
            
            if (chats.length === 0) {
                chatsListContainer.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Чатов пока нет</div>';
                return;
            }
            
            chats.forEach(chat => {
                const chatElement = document.createElement('div');
                chatElement.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
                chatElement.innerHTML = `
                    <div class="chat-item-info">
                        <div class="chat-item-name">${chat.title}</div>
                        <span class="chat-item-type ${chat.type}">${getChatTypeLabel(chat.type)}</span>
                    </div>
                    <div class="chat-item-actions">
                        <button class="rename-btn" onclick="event.stopPropagation(); renameChat('${chat.id}', '${chat.title}')" title="Переименовать">✏️</button>
                        <button class="export-btn" onclick="event.stopPropagation(); exportChat('${chat.id}')" title="Экспорт в DOCX">📥</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteChat('${chat.id}')" title="Удалить">×</button>
                    </div>
                `;
                chatElement.onclick = () => selectChat(chat.id);
                chatsListContainer.appendChild(chatElement);
            });
        }

        // Получение русскоязычного названия типа чата
        function getChatTypeLabel(type) {
            const labels = {
                'marketing': 'Маркетинг',
                'management': 'Менеджмент',
                'finance': 'Финансы',
                'helper': 'Помощник'
            };
            return labels[type] || type;
        }

        // Выбор компании
        async function selectCompany(companyId) {
            if (companyId === currentCompanyId) return;
            
            currentCompanyId = companyId;
            currentChatId = null;
            
            // Закрываем текущее соединение
            if (ws) {
                ws.close();
                ws = null;
            }
            
            // Обновляем UI
            updateCompaniesListUI();
            clearChatMessages();
            statusElement.textContent = 'Загрузка чатов компании...';
            statusElement.className = 'status';
            messageInputElement.disabled = true;
            sendButtonElement.disabled = true;
            newChatBtn.disabled = false;
            uploadBtn.disabled = false;
            
            // Загружаем чаты компании для пользователя
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users/${USER_ID}/chats`);
                if (!response.ok) {
                    throw new Error('Ошибка загрузки чатов');
                }
                
                const chats = await response.json();
                updateChatsList(chats);
                
                // Загружаем документы компании
                await loadCompanyDocs(companyId);
                
                statusElement.textContent = 'Выберите чат или создайте новый';
                
            } catch (error) {
                console.error('Ошибка загрузки чатов компании:', error);
                showError('Ошибка загрузки чатов: ' + error.message);
            }
        }

        // Выбор чата
        async function selectChat(chatId) {
            if (chatId === currentChatId || !currentCompanyId) return;
            
            // Закрываем текущее соединение
            if (ws) {
                ws.close();
                ws = null;
            }
            
            currentChatId = chatId;
            isConnected = false;
            
            // Обновляем UI
            updateChatsListUI();
            clearChatMessages();
            statusElement.textContent = 'Подключение к чату...';
            statusElement.className = 'status';
            messageInputElement.disabled = true;
            sendButtonElement.disabled = true;
            
            // Загружаем историю чата
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${currentCompanyId}/chats/${chatId}`);
                if (!response.ok) {
                    throw new Error('Ошибка загрузки чата');
                }
                
                const chat = await response.json();
                displayChatHistory(chat.messages);
                
                // Подключаемся к WebSocket
                connectWebSocket();
                
            } catch (error) {
                console.error('Ошибка загрузки чата:', error);
                showError('Ошибка загрузки чата: ' + error.message);
            }
        }

        // Обновление UI списка компаний
        function updateCompaniesListUI() {
            const companyItems = companiesListContainer.querySelectorAll('.company-item');
            companyItems.forEach(item => {
                item.classList.remove('active');
            });
        }

        // Обновление UI списка чатов
        function updateChatsListUI() {
            const chatItems = chatsListContainer.querySelectorAll('.chat-item');
            chatItems.forEach(item => {
                item.classList.remove('active');
            });
        }

        // Очистка сообщений чата
        function clearChatMessages() {
            const messagesToRemove = chatMessagesElement.querySelectorAll('.message, .error-message, .success-message');
            messagesToRemove.forEach(msg => msg.remove());
            hideTypingIndicator();
        }

        // Отображение истории чата
        function displayChatHistory(messages) {
            clearChatMessages();
            messages.forEach(message => {
                addMessageToChat(message.role, message.content, message.timestamp, false);
            });
            scrollToBottom();
        }

        // Подключение к WebSocket
        function connectWebSocket() {
            if (!currentCompanyId || !currentChatId) {
                showError('Компания или чат не выбран');
                return;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}${window.location.host}/api/companies/${currentCompanyId}/ws/chats/${currentChatId}?user_id=${USER_ID}`;
            
            console.log('Подключение к WebSocket:', wsUrl);
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = function() {
                console.log('WebSocket подключен');
                isConnected = true;
                statusElement.textContent = 'Подключено';
                statusElement.className = 'status connected';
                messageInputElement.disabled = false;
                sendButtonElement.disabled = false;
                messageInputElement.focus();
            };
            
            ws.onmessage = function(event) {
                console.log('Получено сообщение:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Ошибка парсинга сообщения:', error);
                }
            };
            
            ws.onclose = function(event) {
                console.log('WebSocket закрыт:', event.code, event.reason);
                isConnected = false;
                statusElement.textContent = `Отключено (код: ${event.code})`;
                statusElement.className = 'status';
                messageInputElement.disabled = true;
                sendButtonElement.disabled = true;
                hideTypingIndicator();
                
                // Автопереподключение только для нормальных закрытий
                if (event.code !== 1000 && event.code !== 1001) {
                    setTimeout(() => {
                        if (!isConnected && currentCompanyId && currentChatId) {
                            connectWebSocket();
                        }
                    }, 3000);
                }
            };
            
            ws.onerror = function(error) {
                console.error('WebSocket ошибка:', error);
                statusElement.textContent = 'Ошибка соединения';
                statusElement.className = 'status error';
            };
        }

        // Обработка сообщений от WebSocket
        function handleWebSocketMessage(data) {
            if (data.type === 'chat_history') {
                displayChatHistory(data.messages);
            } else if (data.role === 'model') {
                addMessageToChat('model', data.content, new Date().toISOString(), true);
                hideTypingIndicator();
            } else if (data.error) {
                showError('Ошибка ИИ: ' + data.error);
                hideTypingIndicator();
            }
        }

        // Добавление сообщения в чат
        function addMessageToChat(role, content, timestamp = null, isNew = true) {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${role === 'user' ? 'user-message' : 'model-message'}`;
            
            const messageTime = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
            const senderName = role === 'user' ? 'Вы' : 'AI Ассистент';
            
            messageElement.innerHTML = `
                <div class="message-sender">${senderName}</div>
                <div class="message-content">${content}</div>
                <div class="message-time">${messageTime}</div>
            `;
            
            if (isNew) {
                messageElement.style.animation = 'fadeIn 0.3s ease-in';
            }
            
            chatMessagesElement.appendChild(messageElement);
            
            if (isNew) {
                scrollToBottom();
            }
        }

        // Управление индикатором набора текста
        function showTypingIndicator() {
            typingIndicator.classList.add('active');
            scrollToBottom();
        }

        function hideTypingIndicator() {
            typingIndicator.classList.remove('active');
        }

        // Показать ошибку
        function showError(message) {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = message;
            chatMessagesElement.appendChild(errorElement);
            scrollToBottom();
            
            // Автоудаление через 5 секунд
            setTimeout(() => {
                if (errorElement.parentElement) {
                    errorElement.remove();
                }
            }, 5000);
        }

        // Показать успешное сообщение
        function showSuccess(message) {
            const successElement = document.createElement('div');
            successElement.className = 'success-message';
            successElement.textContent = message;
            chatMessagesElement.appendChild(successElement);
            scrollToBottom();
            
            setTimeout(() => {
                if (successElement.parentElement) {
                    successElement.remove();
                }
            }, 3000);
        }

        // Прокрутка вниз
        function scrollToBottom() {
            chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
        }

        // Настройка обработчиков событий
        function setupEventListeners() {
            // Отправка сообщения по нажатию кнопки
            sendButtonElement.addEventListener('click', sendMessage);
            
            // Отправка сообщения по Enter
            messageInputElement.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
            
            // Создание новой компании
            newCompanyBtn.addEventListener('click', showCreateCompanyModal);
            
            // Создание нового чата
            newChatBtn.addEventListener('click', showCreateChatModal);
            
            // Загрузка документов
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileUpload);
            
            // Модальные окна
            closeCompanyModalBtn.addEventListener('click', hideCreateCompanyModal);
            cancelCompanyCreateBtn.addEventListener('click', hideCreateCompanyModal);
            confirmCompanyCreateBtn.addEventListener('click', createNewCompany);
            
            closeChatModalBtn.addEventListener('click', hideCreateChatModal);
            cancelChatCreateBtn.addEventListener('click', hideCreateChatModal);
            confirmChatCreateBtn.addEventListener('click', createNewChat);
            
            closeRenameModalBtn.addEventListener('click', hideRenameModal);
            cancelRenameBtn.addEventListener('click', hideRenameModal);
            confirmRenameBtn.addEventListener('click', confirmRename);
            
            // Закрытие модальных окон по клику вне их
            window.addEventListener('click', function(event) {
                if (event.target === createCompanyModal) {
                    hideCreateCompanyModal();
                }
                if (event.target === createChatModal) {
                    hideCreateChatModal();
                }
                if (event.target === renameChatModal) {
                    hideRenameModal();
                }
            });
        }

        // Показать модальное окно создания компании
        function showCreateCompanyModal() {
            createCompanyModal.style.display = 'block';
            companyNameInput.value = '';
            companyDescriptionInput.value = '';
        }

        // Скрыть модальное окно создания компании
        function hideCreateCompanyModal() {
            createCompanyModal.style.display = 'none';
        }

        // Создание новой компании
        async function createNewCompany() {
            const name = companyNameInput.value.trim();
            const description = companyDescriptionInput.value.trim();
            
            if (!name) {
                showError('Введите название компании');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/companies`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: name,
                        description: description
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка создания компании');
                }
                
                const newCompany = await response.json();
                hideCreateCompanyModal();
                showSuccess(`Компания "${name}" успешно создана`);
                
                // Обновляем список компаний
                await initializeApp();
                
            } catch (error) {
                console.error('Ошибка создания компании:', error);
                showError('Ошибка создания компании: ' + error.message);
            }
        }

        // Показать модальное окно создания чата
        function showCreateChatModal() {
            if (!currentCompanyId) {
                showError('Сначала выберите компанию');
                return;
            }
            createChatModal.style.display = 'block';
            chatTitleInput.value = '';
            chatTypeSelect.value = 'marketing';
        }

        // Скрыть модальное окно создания чата
        function hideCreateChatModal() {
            createChatModal.style.display = 'none';
        }

        // Создание нового чата
        async function createNewChat() {
            const title = chatTitleInput.value.trim();
            const type = chatTypeSelect.value;
            
            if (!title) {
                showError('Введите название чата');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${currentCompanyId}/chats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: USER_ID,
                        title: title,
                        type: type
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка создания чата');
                }
                
                const newChat = await response.json();
                hideCreateChatModal();
                showSuccess(`Чат "${title}" успешно создан`);
                
                // Обновляем список чатов
                await selectCompany(currentCompanyId);
                
                // Выбираем новый чат
                selectChat(newChat.chat_id);
                
            } catch (error) {
                console.error('Ошибка создания чата:', error);
                showError('Ошибка создания чата: ' + error.message);
            }
        }

        // Показать модальное окно переименования чата
        function renameChat(chatId, currentTitle) {
            currentRenamingChatId = chatId;
            renameChatTitleInput.value = currentTitle;
            renameChatModal.style.display = 'block';
        }

        // Скрыть модальное окно переименования
        function hideRenameModal() {
            renameChatModal.style.display = 'none';
            currentRenamingChatId = null;
            renameChatTitleInput.value = '';
        }

        // Подтверждение переименования чата
        async function confirmRename() {
            const newTitle = renameChatTitleInput.value.trim();
            
            if (!newTitle) {
                showError('Введите новое название чата');
                return;
            }
            
            if (!currentRenamingChatId || !currentCompanyId) {
                showError('Ошибка: чат не выбран');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/companies/${currentCompanyId}/chats/${currentRenamingChatId}/rename`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: newTitle
                    })
                });
                
                if (response.ok) {
                    const updatedChat = await response.json();
                    hideRenameModal();
                    showSuccess('Чат успешно переименован');
                    
                    // Обновляем список чатов
                    await selectCompany(currentCompanyId);
                    
                    // Если переименованный чат активен, обновляем заголовок
                    if (currentChatId === currentRenamingChatId) {
                        // Можно обновить заголовок в интерфейсе, если нужно
                    }
                } else {
                    showError('Ошибка при переименовании чата');
                }
            } catch (error) {
                console.error('Ошибка переименования:', error);
                showError('Ошибка при переименовании: ' + error.message);
            }
        }

        // Экспорт истории чата в DOCX
        async function exportChat(chatId) {
            if (!currentCompanyId) {
                showError('Сначала выберите компанию');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/companies/${currentCompanyId}/chats/${chatId}/export`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    
                    // Получаем имя файла из заголовка Content-Disposition или генерируем
                    const contentDisposition = response.headers.get('Content-Disposition');
                    let filename = `chat_export_${chatId}.docx`;
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                        if (filenameMatch) {
                            filename = filenameMatch[1];
                        }
                    }
                    
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    showSuccess('История чата успешно экспортирована');
                } else {
                    showError('Ошибка при экспорте чата');
                }
            } catch (error) {
                console.error('Ошибка экспорта:', error);
                showError('Ошибка при экспорте: ' + error.message);
            }
        }

        // Удаление чата
        async function deleteChat(chatId) {
            if (!confirm('Вы уверены, что хотите удалить этот чат?')) {
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${currentCompanyId}/chats/${chatId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка удаления чата');
                }
                
                showSuccess('Чат успешно удален');
                
                // Если удаляемый чат активен, очищаем интерфейс
                if (currentChatId === chatId) {
                    currentChatId = null;
                    if (ws) {
                        ws.close();
                        ws = null;
                    }
                    clearChatMessages();
                    messageInputElement.disabled = true;
                    sendButtonElement.disabled = true;
                    statusElement.textContent = 'Выберите чат для начала общения';
                    statusElement.className = 'status';
                }
                
                // Обновляем список чатов
                await selectCompany(currentCompanyId);
                
            } catch (error) {
                console.error('Ошибка удаления чата:', error);
                showError('Ошибка удаления чата: ' + error.message);
            }
        }

        // Обработка загрузки файлов
        async function handleFileUpload(event) {
            const files = event.target.files;
            if (!files.length) return;
            
            for (let file of files) {
                await uploadFile(file);
            }
            
            // Сбрасываем input
            fileInput.value = '';
        }

        // Загрузка файла на сервер
        async function uploadFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${currentCompanyId}/docs/upload/`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    showSuccess(`Документ "${file.name}" успешно загружен`);
                    loadCompanyDocs(currentCompanyId); // Обновляем список документов
                } else {
                    showError(`Ошибка загрузки документа: ${response.statusText}`);
                }
            } catch (error) {
                showError(`Ошибка загрузки: ${error.message}`);
            }
        }

        // Отправка сообщения
        function sendMessage() {
            const message = messageInputElement.value.trim();
            if (!message || !isConnected || !ws) {
                showError('Невозможно отправить сообщение');
                return;
            }

            // Добавляем сообщение пользователя
            addMessageToChat('user', message);
            
            // Показываем индикатор набора
            showTypingIndicator();
            
            // Отправляем сообщение через WebSocket
            ws.send(JSON.stringify({
                role: 'user',
                content: message
            }));

            // Очищаем поле ввода
            messageInputElement.value = '';
        }
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

# Эндпоинты для управления компаниями

@app.get("/api/companies", response_model=List[Company])
async def get_companies_list():
    """Получение списка всех компаний"""
    return get_all_companies()

@app.post("/api/companies", response_model=Company)
async def create_company(company_data: CompanyCreate):
    """Создание новой компании"""
    company_id = str(uuid.uuid4())
    new_company = Company(
        id=company_id,
        name=company_data.name,
        description=company_data.description
    )
    save_company(new_company)
    return new_company

@app.get("/api/companies/{company_id}", response_model=Company)
async def get_company(company_id: str):
    """Получение информации о компании"""
    company = load_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

# Эндпоинты для управления контекстами

@app.post("/api/companies/{company_id}/context/")
async def set_company_context(company_id: str, context: ContextUpdate):
    update_company_context(company_id, context.content)
    return {"status": "Company context updated"}

@app.get("/api/companies/{company_id}/context/")
async def get_company_context_endpoint(company_id: str):
    return {"content": get_company_context(company_id)}

# Эндпоинты для управления чатами

@app.get("/api/companies/{company_id}/users/{user_id}/chats", response_model=List[ChatMeta])
async def get_user_chats_endpoint(company_id: str, user_id: str):
    """Получение списка чатов пользователя в компании"""
    return get_user_chats(company_id, user_id)

@app.get("/api/companies/{company_id}/chats", response_model=List[ChatMeta])
async def get_company_chats_endpoint(company_id: str):
    """Получение всех чатов компании"""
    return get_all_company_chats(company_id)

@app.post("/api/companies/{company_id}/chats", response_model=Chat)
async def create_chat(company_id: str, chat_data: ChatCreate):
    """Создание нового чата в компании"""
    # Проверяем существование компании
    company = load_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    chat_id = str(uuid.uuid4())
    new_chat = Chat(
        chat_id=chat_id,
        company_id=company_id,
        user_id=chat_data.user_id,
        type=chat_data.type,
        title=chat_data.title,
        messages=[]
    )
    save_chat(new_chat)
    return new_chat

@app.get("/api/companies/{company_id}/exists")
async def check_company_exists(company_id: str):
    """Проверка существования компании"""
    company = load_company(company_id)
    if company:
        return {"exists": True, "company": company}
    else:
        return {"exists": False}

@app.delete("/api/companies/{company_id}/chats/{chat_id}")
async def delete_chat_endpoint(company_id: str, chat_id: str):
    """Удаление чата"""
    if delete_chat(company_id, chat_id):
        return {"status": f"Chat {chat_id} deleted"}
    else:
        raise HTTPException(status_code=404, detail="Chat not found")

@app.get("/api/companies/{company_id}/chats/{chat_id}", response_model=Chat)
async def get_chat(company_id: str, chat_id: str):
    """Получение полной информации о чате"""
    chat = load_chat(company_id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

# Эндпоинты для работы с документами компаний

@app.get("/api/companies/{company_id}/docs/")
async def get_company_docs(company_id: str):
    """Получение списка документов компании"""
    return get_company_docs_list(company_id)

@app.post("/api/companies/{company_id}/docs/upload/")
async def upload_company_doc(company_id: str, file: UploadFile = File(...)):
    """Загрузка документа компании"""
    allowed_extensions = {'.docx', '.xlsx', '.svg', '.txt', '.pdf'}
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Недопустимый формат файла")
    
    docs_dir = get_company_docs_dir(company_id)
    ensure_company_directories(company_id)
    file_path = os.path.join(docs_dir, file.filename)
    
    try:
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        return {"status": "File uploaded successfully", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки файла: {str(e)}")

@app.get("/api/companies/{company_id}/docs/download/{filename}")
async def download_company_doc(company_id: str, filename: str):
    """Скачивание документа компании по имени файла"""
    
    # Безопасная проверка имени файла
    if not filename or filename.strip() != filename:
        raise HTTPException(status_code=400, detail="Некорректное имя файла")
    
    # Запрещаем пути с ../ для безопасности
    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(status_code=400, detail="Недопустимое имя файла")
    
    docs_dir = get_company_docs_dir(company_id)
    file_path = os.path.join(docs_dir, filename)
    
    # Проверяем существование файла
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Определяем Content-Type в зависимости от расширения файла
    content_types = {
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
        '.pdf': 'application/pdf'
    }
    
    file_extension = Path(filename).suffix.lower()
    media_type = content_types.get(file_extension, 'application/octet-stream')
    
    # Возвращаем файл для скачивания
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )

# WebSocket эндпоинт для чата

@app.websocket("/api/companies/{company_id}/ws/chats/{chat_id}")
async def websocket_chat(websocket: WebSocket, company_id: str, chat_id: str):
    user_id = websocket.query_params.get("user_id")
    if not user_id:
        await websocket.close(code=1008, reason="User ID required")
        return

    chat = load_chat(company_id, chat_id)
    if not chat:
        await websocket.close(code=1008, reason="Chat not found")
        return

    if chat.user_id != user_id:
        await websocket.close(code=1008, reason="Access denied")
        return

    connection_id = f"{company_id}_{chat_id}_{user_id}"
    await manager.connect(websocket, connection_id)
    
    try:
        # Отправляем текущую историю чата
        await websocket.send_text(json.dumps({
            "type": "chat_history",
            "messages": [msg.dict() for msg in chat.messages]
        }, ensure_ascii=False))
        
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if "role" in message_data and message_data["role"] == "user":
                user_message_content = message_data.get("content", "")
                
                # Сохраняем сообщение пользователя
                user_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    role="user",
                    content=user_message_content,
                    timestamp=datetime.now().isoformat()
                )
                
                append_message_to_chat(company_id, chat_id, user_msg)
                
                # Генерируем ответ ИИ
                try:
                    ai_response_content = await generate_ai_response(company_id, chat_id, user_message_content)
                    
                    # Сохраняем ответ модели
                    ai_msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        role="model",
                        content=ai_response_content,
                        timestamp=datetime.now().isoformat()
                    )
                    
                    append_message_to_chat(company_id, chat_id, ai_msg)
                    
                    # Отправляем ответ модели клиенту
                    await websocket.send_text(json.dumps({
                        "chat_id": chat_id,
                        "role": "model",
                        "content": ai_response_content
                    }, ensure_ascii=False))
                    
                except Exception as e:
                    logger.error(f"Ошибка генерации ответа ИИ: {e}")
                    await websocket.send_text(json.dumps({
                        "error": f"Ошибка ИИ: {str(e)}"
                    }, ensure_ascii=False))
                
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        logger.info(f"WebSocket disconnected for chat {chat_id} in company {company_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(connection_id)



# Эндпоинт для переименования чата
@app.put("/api/companies/{company_id}/chats/{chat_id}/rename")
async def rename_chat_endpoint(company_id: str, chat_id: str, rename_data: ChatRename):
    """Переименование чата"""
    if not rename_data.title.strip():
        raise HTTPException(status_code=400, detail="Название чата не может быть пустым")
    
    chat = load_chat(company_id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")
    
    if rename_chat(company_id, chat_id, rename_data.title):
        updated_chat = load_chat(company_id, chat_id)
        return updated_chat
    else:
        raise HTTPException(status_code=500, detail="Ошибка при переименовании чата")

# Эндпоинт для экспорта истории чата в DOCX
@app.get("/api/companies/{company_id}/chats/{chat_id}/export")
async def export_chat_history(company_id: str, chat_id: str):
    """Экспорт истории чата в DOCX формате"""
    
    # Проверяем существование чата
    chat = load_chat(company_id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")
    
    try:
        # Генерируем DOCX файл
        from .document_processor import generate_chat_history_docx
        file_path, filename = await generate_chat_history_docx(company_id, chat_id)
        
        # Возвращаем файл для скачивания
        return FileResponse(
            path=file_path,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename=filename
        )
        
    except Exception as e:
        logger.error(f"Ошибка при экспорте чата: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при экспорте чата: {str(e)}")

# Системные эндпоинты



@app.get("/api/debug/ai-config")
async def debug_ai_config():
    """Отладочная информация о конфигурации AI"""
    return {
        "ai_url": AI_URL,
        "use_mock_ai": os.getenv("USE_MOCK_AI", "false"),
        "timestamp": datetime.now().isoformat()
    }

# Импорты схем и моделей
from .data import db_session
from .data.users import User
from .data.compans import Company
from .data.tasks import Task
from .data.shemas import (
    UserBase, UserUpdate, UserInn, UserCreate, CompanyBase, CompanyUpdate,
    CompanyId, TaskBase, TaskDel, TaskUpdate, UserRegistration  # Добавлена UserRegistration
)
from .data.db_session import global_init


#
#  --- Вспомогательные функции ---

# Инициализация БД при запуске
@app.on_event("startup")
def startup_event():
    BASE_DIR = Path(__file__).parent
    DB_DIR = BASE_DIR / "db"
    DB_PATH = DB_DIR / "db_vavilonus.db"
    
    # Создаем директорию
    DB_DIR.mkdir(exist_ok=True)
    
    print(f"🔄 Инициализация БД по пути: {DB_PATH}")
    
    from app.data.db_session import global_init
    try:
        global_init(str(DB_PATH))
        print("✅ База данных успешно инициализирована")
    except Exception as e:
        print(f"❌ Критическая ошибка инициализации БД: {e}")
        # В продакшене здесь нужно завершать приложение
        import sys
        sys.exit(1)




@contextmanager
def get_db_session():
    """Контекстный менеджер для работы с сессией базы данных."""
    session = db_session.create_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# --- Инициализация БД и шаблонов ---

def startup_db():
    """Инициализация базы данных."""
    db_session.global_init("./db/db_vavilonus.db")
BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = BASE_DIR / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))



# --- Эндпоинты ---

@app.get("/", response_class=HTMLResponse)
async def get_register_form(request: Request):
    """
    Отображает HTML-форму регистрации пользователя.
    """
    return templates.TemplateResponse("register.html", {"request": request})


# --- Эндпоинт для отображения формы регистрации ---
@app.get("/register", response_class=HTMLResponse)
async def show_registration_page(request: Request):
    """
    Отображает страницу регистрации с формой.
    """
    return templates.TemplateResponse("register.html", {"request": request})


# --- Эндпоинт для отображения формы входа ---
@app.get("/login", response_class=HTMLResponse)
async def show_login_page(request: Request):
    """
    Отображает страницу входа с формой.
    """
    return templates.TemplateResponse("login.html", {"request": request})


# --- Эндпоинт для обработки данных формы регистрации ---
@app.post("/register_handler")
async def handle_registration(
        full_name: Annotated[str, Form(..., description="Полное имя пользователя")],
        password: Annotated[str, Form(..., description="Пароль пользователя")],
        inn: Annotated[int, Form(..., description="ИНН пользователя")],
        is_director: Annotated[bool, Form(description="Является ли пользователь директором")] = False
):
    """
    Обрабатывает данные, отправленные из формы регистрации.
    - **full_name**: Полное имя пользователя.
    - **password**: Пароль пользователя (не хэшируется).
    - **inn**: ИНН пользователя.
    - **is_director**: Флаг, является ли пользователь директором.
    """
    # Валидация ИНН теперь в схеме UserBase/UserRegistration (через Field)
    # Но можно добавить дополнительную бизнес-логику здесь, если нужно

    # Определяем роль на основе чекбокса
    role = "director" if is_director else "worker"

    # Проверка существования пользователя с таким ИНН
    with get_db_session() as session:
        existing_user = session.query(User).filter(User.inn == inn).first()
        if existing_user:
            # Обновляем данные существующего пользователя
            existing_user.full_name = full_name
            existing_user.role = role
            existing_user.hashed_password = password  # Сохраняем пароль как есть
            # session.commit() # commit уже произойдет в контекстном менеджере
            return JSONResponse(status_code=200, content={'message': 'Данные пользователя обновлены.'})
        else:
            # Создаем нового пользователя
            # Используем UserCreate для валидации данных перед созданием
            validated_user_data = UserCreate(
                full_name=full_name, inn=inn, role=role, password=password  # передаем password для валидации
            )
            # Создаем экземпляр модели, исключая пароль
            new_user = User(
                full_name=validated_user_data.full_name,
                inn=validated_user_data.inn,
                role=validated_user_data.role,
                hashed_password=password  # Сохраняем пароль как есть
            )
            session.add(new_user)
            # session.commit() # commit уже произойдет в контекстном менеджере
            return JSONResponse(status_code=201, content={'message': 'Пользователь успешно зарегистрирован.'})


# --- Эндпоинт для обработки данных формы входа ---
@app.post("/login_handler")
async def handle_login(
        inn: Annotated[int, Form(..., description="ИНН пользователя")],
        password: Annotated[str, Form(..., description="Пароль пользователя")]
):
    """
    Обрабатывает данные, отправленные из формы входа.
    - **inn**: ИНН пользователя.
    - **password**: Введенный пароль.
    """
    with get_db_session() as session:
        # Ищем пользователя по ИНН
        user = session.query(User).filter(User.inn == inn).first()

        if not user:
            raise HTTPException(status_code=401, detail='Неверный ИНН или пароль.')

        # Проверяем пароль (сравниваем напрямую)
        if user.hashed_password != password:
            raise HTTPException(status_code=401, detail='Неверный ИНН или пароль.')

        # Здесь можно создать токен (например, JWT), но для простоты возвращаем JSON
        return JSONResponse(
            status_code=200,
            content={
                'message': 'Успешный вход.',
                'user_info': {
                    'id': user.id,
                    'full_name': user.full_name,
                    'inn': user.inn,
                    'role': user.role
                }
            }
        )


# --- Старые эндпоинты (оставлены как есть, но теперь `/register` отображает форму, а `/register_handler` обрабатывает) ---
# --- Пользователи (Users) ---

@app.get('/api/users/{inn}')
async def get_user_by_inn(
        inn: Annotated[int, Path(description="ИНН пользователя")]
):
    """
    Получает информацию о пользователе по его ИНН.
    - **inn**: ИНН пользователя (в пути URL).
    """
    with get_db_session() as session:
        cur_user = session.query(User).filter(User.inn == inn).first()
        if not cur_user:
            raise HTTPException(status_code=404, detail='Пользователя с таким ИНН не существует.')
        # Простой способ сериализации, можно улучшить с Pydantic
        return {
            "id": cur_user.id,
            "full_name": cur_user.full_name,
            "inn": cur_user.inn,
            "company_id": cur_user.company_id,
            "role": cur_user.role,
            "folder_path": cur_user.folder_path,
            # "company": cur_user.company # Не включаем объект company, если не нужно
        }


@app.post('/api/users/')
async def add_user(user: UserCreate):
    """
    Создает нового пользователя.
    - **user**: Объект пользователя с обязательными полями (full_name, inn).
    """
    # Теперь БД уже инициализирована, просто используем сессию
    try:
        with get_db_session() as session:
            # Проверка на дубликат ИНН
            existing_user = session.query(User).filter(User.inn == user.inn).first()
            if existing_user:
                raise HTTPException(status_code=409, detail='Пользователь с таким ИНН уже существует.')

            new_user = User(
                full_name=user.full_name,
                inn=user.inn,
                role=user.role,
                folder_path=user.folder_path,
                hashed_password=user.password
            )
            session.add(new_user)
            session.commit()
            session.refresh(new_user)
        return JSONResponse(status_code=201, content={'message': 'Пользователь успешно создан.'})
    except Exception as e:
        print(f"❌ Ошибка в add_user: {e}")
        raise



@app.put('/api/users/{inn}')
async def update_user(
        inn: Annotated[int, Path(description="ИНН пользователя для обновления")],
        user_update: UserUpdate
):
    """
    Обновляет данные пользователя по его ИНН. Обновляются только переданные поля.
    - **inn**: ИНН пользователя (в пути URL).
    - **user_update**: Объект с полями, которые нужно обновить.
    """
    with get_db_session() as session:
        cur_user = session.query(User).filter(User.inn == inn).first()
        if not cur_user:
            raise HTTPException(status_code=404, detail='Пользователя с таким ИНН не существует.')

        # Обновление только указанных полей
        if user_update.full_name is not None:
            cur_user.full_name = user_update.full_name
        if user_update.role is not None:
            cur_user.role = user_update.role
        if user_update.folder_path is not None:
            cur_user.folder_path = user_update.folder_path
        # ИНН не обновляем, так как это уникальный идентификатор

        session.commit()
    return JSONResponse(status_code=200, content={'message': 'Пользователь успешно обновлен.'})


@app.delete('/api/users/{inn}')
async def delete_user(
        inn: Annotated[int, Path(description="ИНН пользователя для удаления")]
):
    """
    Удаляет пользователя по его ИНН и убирает его из списка сотрудников всех компаний.
    - **inn**: ИНН пользователя (в пути URL).
    """
    with get_db_session() as session:
        cur_user = session.query(User).filter(User.inn == inn).first()
        if not cur_user:
            raise HTTPException(status_code=404, detail='Пользователя с таким ИНН не существует.')

        # Удалить ИНН пользователя из списка сотрудников всех компаний
        companies = session.query(Company).filter(Company.emploees_inn.any(inn))
        for company in companies:
            if inn in company.emploees_inn:
                company.emploees_inn.remove(inn)
                # Опционально: сбросить company_id у пользователя
                if cur_user.company_id == company.id:
                    cur_user.company_id = None

        # Физическое удаление пользователя
        session.delete(cur_user)
        session.commit()
    return JSONResponse(status_code=200, content={'message': 'Пользователь успешно удален.'})


@app.put('/api/users/{inn}/add_to_company/{company_id}')
async def add_user_to_company(
        inn: Annotated[int, Path(description="ИНН пользователя для добавления")],
        company_id: Annotated[int, Path(description="ID компании, в которую добавляется пользователь")]
):
    """
    Добавляет пользователя по ИНН в компанию по ID. Если пользователя нет, он создается.
    - **inn**: ИНН пользователя (в пути URL).
    - **company_id**: ID компании (в пути URL).
    """
    with get_db_session() as session:
        cur_user = session.query(User).filter(User.inn == inn).first()
        if not cur_user:
            # Создаем пользователя с минимальными данными
            new_user = User(inn=inn, full_name="")  # full_name может быть пустым при добавлении
            session.add(new_user)
            session.flush()  # Для получения ID, если нужно
            cur_user = new_user

        cur_company = session.query(Company).get(company_id)
        if not cur_company:
            raise HTTPException(status_code=404, detail='Компании с таким ID не существует.')

        # Проверяем, не состоит ли пользователь уже в компании
        if inn not in cur_company.emploees_inn:
            lst = cur_company.emploees_inn[:]
            lst.append(inn)
            cur_company.emploees_inn=lst[:]
        # Обновляем company_id у пользователя
        cur_user.company_id = company_id

        session.commit()
    return JSONResponse(status_code=200, content={'message': 'Пользователь успешно добавлен в компанию.'})


# --- Компании (Companies) ---

@app.post('/api/compans/')
async def add_company(company: CompanyBase):
    """
    Создает новую компанию.
    - **company**: Объект компании с обязательными полями.
    """
    from app.data.db_session import global_init, create_session
    try:
        global_init("./bd/db_vavilonus.db")
    except:
        pass  # Уже инициализирована
    
    try:
        with get_db_session() as session:
        # Проверка существования директора
            director = session.query(User).filter(User.id == company.director_id).first()
            if not director:
                raise HTTPException(status_code=404, detail='Пользователя с ID директора не существует.')

            new_company = Company(
                company_name=company.company_name,
                director_id=company.director_id,
                inn=company.inn,
                folder_path=company.folder_path,
                emploees_inn=company.emploees_inn
            )
            DATA_DIR = "app_data"
            COMPANIES_DIR = os.path.join(DATA_DIR, "companies")

    # Создаем необходимые директории
            Path(DATA_DIR).mkdir(exist_ok=True)
            Path(COMPANIES_DIR).mkdir(exist_ok=True)
            ensure_company_directories(new_company.inn)
            folder_path = get_company_dir(new_company.inn)
            session.add(new_company)
            session.commit()
            session.refresh(new_company)
        return JSONResponse(status_code=201, content={'message': 'Компания успешно создана.'})
    except Exception as e:
        print(f"❌ Ошибка в add_company: {e}")
        raise

@app.put('/api/compans/{id}')
async def update_company(
        id: Annotated[int, Path(description="ID компании для обновления")],
        company_update: CompanyUpdate
):
    """
    Обновляет данные компании по её ID. Обновляются только переданные поля.
    - **id**: ID компании (в пути URL).
    - **company_update**: Объект с полями, которые нужно обновить.
    """
    with get_db_session() as session:
        up_company = session.query(Company).get(id)
        if not up_company:
            raise HTTPException(status_code=404, detail='Компании с таким ID не существует.')

        # Проверка существования нового директора, если он указан
        if company_update.director_id is not None:
            director = session.query(User).filter(User.id == company_update.director_id).first()
            if not director:
                raise HTTPException(status_code=404, detail='Пользователя с ID нового директора не существует.')

        # Обновление только указанных полей
        if company_update.company_name is not None:
            up_company.company_name = company_update.company_name
        if company_update.director_id is not None:
            up_company.director_id = company_update.director_id
        if company_update.inn is not None:
            up_company.inn = company_update.inn
        if company_update.folder_path is not None:
            up_company.folder_path = company_update.folder_path
        if company_update.emploees_inn is not None:
            up_company.emploees_inn = company_update.emploees_inn

        session.commit()
    return JSONResponse(status_code=200, content={'message': 'Компания успешно обновлена.'})


# --- Задачи (Tasks) ---

@app.post('/api/tasks/')
async def add_task(
        inn: Annotated[int, Query(..., description="ИНН пользователя, которому назначается задача")],
        task: TaskBase
):
    """
    Создает новую задачу и назначает её пользователю по ИНН.
    - **inn**: ИНН исполнителя (в параметрах запроса).
    - **task**: Объект задачи с обязательными полями.
    """
    with get_db_session() as session:
        cur_user = session.query(User).filter(User.inn == inn).first()
        if not cur_user:
            raise HTTPException(status_code=404, detail='Пользователя с таким ИНН не существует.')

        new_task = Task(
            id_worker=cur_user.id,
            inn_worker=cur_user.inn,
            task_name=task.task_name,
            deadline=task.deadline,
            task_body=task.task_body,
            complete=task.complete
        )
        session.add(new_task)
        session.commit()
        session.refresh(new_task)
    return JSONResponse(status_code=201, content={'message': 'Задача успешно создана.', 'task_id': new_task.id})


@app.delete('/api/tasks/{task_id}')
async def delete_task(
        task_id: Annotated[int, Path(description="ID задачи для удаления")]
):
    """
    Удаляет задачу по её ID.
    - **task_id**: ID задачи (в пути URL).
    """
    with get_db_session() as session:
        cur_task = session.query(Task).get(task_id)
        if not cur_task:
            raise HTTPException(status_code=404, detail='Задачи с таким ID не существует.')

        session.delete(cur_task)
        session.commit()
    return JSONResponse(status_code=200, content={'message': 'Задача успешно удалена.'})


@app.put('/api/tasks/{task_id}')
async def update_task(
        task_id: Annotated[int, Path(description="ID задачи для обновления")],
        task_update: TaskUpdate
):
    """
    Обновляет данные задачи по её ID. Обновляются только переданные поля.
    - **task_id**: ID задачи (в пути URL).
    - **task_update**: Объект с полями, которые нужно обновить.
    """
    with get_db_session() as session:
        cur_task = session.query(Task).get(task_id)
        if not cur_task:
            raise HTTPException(status_code=404, detail='Задачи с таким ID не существует.')

        try:
            if task_update.inn_worker is not None:
                # Назначаем задачу новому пользователю
                new_worker = session.query(User).filter(User.inn == task_update.inn_worker).first()
                if not new_worker:
                    raise HTTPException(status_code=404, detail='Пользователя с новым ИНН не существует.')
                cur_task.inn_worker = task_update.inn_worker
                cur_task.id_worker = new_worker.id

            if task_update.task_name is not None:
                cur_task.task_name = task_update.task_name

            # Обновление дедлайна, если передано
            if task_update.deadline is not None:
                cur_task.deadline = task_update.deadline

            if task_update.task_body is not None:
                cur_task.task_body = task_update.task_body

            if task_update.complete is not None:
                cur_task.complete = task_update.complete

        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Ошибка при обновлении задачи: {str(e)}')

        session.commit()
    return JSONResponse(status_code=200, content={'message': 'Задача успешно обновлена.'})


if __name__ == "__main__":
    import uvicorn
    startup_db()
    print("=== ТЕСТИРУЕМ ИНИЦИАЛИЗАЦИЮ БД ===")
    global_init("test.db")
    from app.data.db_session import create_session
    session = create_session()
    print("✅ Тест пройден - сессия создана")
    session.close()
    uvicorn.run(app, host="0.0.0.0", port=8000)
