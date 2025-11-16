import json
import os
import uuid
from pathlib import Path
from typing import List, Optional
from .models import Chat, ChatMessage, ChatMeta, Company

# Базовые директории
DATA_DIR = "app_data"
COMPANIES_DIR = os.path.join(DATA_DIR, "companies")

# Создаем необходимые директории
Path(DATA_DIR).mkdir(exist_ok=True)
Path(COMPANIES_DIR).mkdir(exist_ok=True)

def get_company_dir(company_id: str) -> str:
    """Получение пути к директории компании"""
    return os.path.join(COMPANIES_DIR, str(company_id))

def get_company_context_file(company_id: str) -> str:
    """Получение пути к файлу контекста компании"""
    return os.path.join(get_company_dir(company_id), "company_context.txt")

def get_user_contexts_dir(company_id: str) -> str:
    """Получение пути к директории контекстов пользователей компании"""
    return os.path.join(get_company_dir(company_id), "user_contexts")

def get_chats_dir(company_id: str) -> str:
    """Получение пути к директории чатов компании"""
    return os.path.join(get_company_dir(company_id), "chats")

def get_company_docs_dir(company_id: str) -> str:
    """Получение пути к директории документов компании"""
    return os.path.join(get_company_dir(company_id), "documents")

def ensure_company_directories(company_id: str):
    """Создание необходимых директорий для компании"""
    company_dir = get_company_dir(company_id)
    Path(company_dir).mkdir(exist_ok=True)
    Path(get_user_contexts_dir(company_id)).mkdir(exist_ok=True, parents=True)
    Path(get_chats_dir(company_id)).mkdir(exist_ok=True, parents=True)
    Path(get_company_docs_dir(company_id)).mkdir(exist_ok=True, parents=True)
    
    # Создаем файл контекста компании по умолчанию
    context_file = get_company_context_file(company_id)
    if not os.path.exists(context_file):
        with open(context_file, 'w', encoding='utf-8') as f:
            f.write(f"Контекст компании: {company_id}")

# Управление компаниями
def save_company(company: Company):
    """Сохранение информации о компании"""
    ensure_company_directories(company.company_id)
    company_file = os.path.join(get_company_dir(company.company_id), "company_info.json")
    with open(company_file, 'w', encoding='utf-8') as f:
        json.dump(company.dict(), f, ensure_ascii=False, indent=2)

def load_company(company_id: str) -> Optional[Company]:
    """Загрузка информации о компании"""
    company_file = os.path.join(get_company_dir(company_id), "company_info.json")
    if os.path.exists(company_file):
        with open(company_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return Company(**data)
    return None

def get_all_companies() -> List[Company]:
    """Получение списка всех компаний"""
    companies = []
    if not os.path.exists(COMPANIES_DIR):
        return companies
        
    for company_id in os.listdir(COMPANIES_DIR):
        company = load_company(company_id)
        if company:
            companies.append(company)
    return companies

# Управление контекстами
def get_company_context(company_id: str) -> str:
    """Получение контекста компании"""
    ensure_company_directories(company_id)
    context_file = get_company_context_file(company_id)
    if os.path.exists(context_file):
        with open(context_file, 'r', encoding='utf-8') as f:
            return f.read()
    return ""

def update_company_context(company_id: str, content: str):
    """Обновление контекста компании"""
    ensure_company_directories(company_id)
    context_file = get_company_context_file(company_id)
    with open(context_file, 'w', encoding='utf-8') as f:
        f.write(content)

def get_user_context(company_id: str, user_id: str) -> str:
    """Получение контекста пользователя"""
    ensure_company_directories(company_id)
    context_file = os.path.join(get_user_contexts_dir(company_id), f"{user_id}.txt")
    if os.path.exists(context_file):
        with open(context_file, 'r', encoding='utf-8') as f:
            return f.read()
    return ""

def update_user_context(company_id: str, user_id: str, content: str):
    """Обновление контекста пользователя"""
    ensure_company_directories(company_id)
    context_file = os.path.join(get_user_contexts_dir(company_id), f"{user_id}.txt")
    with open(context_file, 'w', encoding='utf-8') as f:
        f.write(content)

# Управление чатами
def get_chat_file_path(company_id: str, chat_id: str) -> str:
    """Получение пути к файлу чата"""
    return os.path.join(get_chats_dir(company_id), f"{chat_id}.json")

def save_chat(chat: Chat):
    """Сохранение чата"""
    ensure_company_directories(chat.company_id)
    chat_file = get_chat_file_path(chat.company_id, chat.chat_id)
    with open(chat_file, 'w', encoding='utf-8') as f:
        json.dump(chat.dict(), f, ensure_ascii=False, indent=2)

def load_chat(company_id: str, chat_id: str) -> Optional[Chat]:
    """Загрузка чата"""
    chat_file = get_chat_file_path(company_id, chat_id)
    if os.path.exists(chat_file):
        with open(chat_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return Chat(**data)
    return None

def get_user_chats(company_id: str, user_id: str) -> List[ChatMeta]:
    """Получение списка чатов пользователя в компании"""
    ensure_company_directories(company_id)
    chats_dir = get_chats_dir(company_id)
    chats = []
    
    if not os.path.exists(chats_dir):
        return chats
        
    for file in os.listdir(chats_dir):
        if file.endswith('.json'):
            chat_id = file[:-5]
            chat = load_chat(company_id, chat_id)
            if chat and chat.user_id == user_id:
                chats.append(ChatMeta(
                    id=chat.chat_id,
                    company_id=chat.company_id,
                    user_id=chat.user_id,
                    title=chat.title,
                    type=chat.type,
                    filepath=get_chat_file_path(company_id, chat.chat_id)
                ))
    return chats

def get_all_company_chats(company_id: str) -> List[ChatMeta]:
    """Получение всех чатов компании"""
    ensure_company_directories(company_id)
    chats_dir = get_chats_dir(company_id)
    chats = []
    
    if not os.path.exists(chats_dir):
        return chats
        
    for file in os.listdir(chats_dir):
        if file.endswith('.json'):
            chat_id = file[:-5]
            chat = load_chat(company_id, chat_id)
            if chat:
                chats.append(ChatMeta(
                    id=chat.chat_id,
                    company_id=chat.company_id,
                    user_id=chat.user_id,
                    title=chat.title,
                    type=chat.type,
                    filepath=get_chat_file_path(company_id, chat.chat_id)
                ))
    return chats

def append_message_to_chat(company_id: str, chat_id: str, message: ChatMessage):
    """Добавление сообщения в чат"""
    chat = load_chat(company_id, chat_id)
    if chat:
        chat.messages.append(message)
        save_chat(chat)

def delete_chat(company_id: str, chat_id: str):
    """Удаление чата"""
    chat_file = get_chat_file_path(company_id, chat_id)
    if os.path.exists(chat_file):
        os.remove(chat_file)
        return True
    return False

# Управление документами компаний
def get_company_docs_list(company_id: str):
    """Получение списка документов компании"""
    ensure_company_directories(company_id)
    docs_dir = get_company_docs_dir(company_id)
    
    if not os.path.exists(docs_dir):
        return []
    
    docs = []
    for filename in os.listdir(docs_dir):
        if filename.endswith(('.docx', '.xlsx', '.svg', '.txt', '.pdf')):
            docs.append({"name": filename})
    
    return docs


def rename_chat(company_id: str, chat_id: str, new_title: str):
    """Переименование чата"""
    chat = load_chat(company_id, chat_id)
    if chat:
        chat.title = new_title
        save_chat(chat)
        return True
    return False

def get_chat_exports_dir(company_id: str):
    """Получение пути к директории экспортов чатов компании"""
    return os.path.join(get_chats_dir(company_id), "exports")

def get_company_chats_dir(company_id: str) -> str:
    """Получение пути к директории чатов компании"""
    return f"data/companies/{company_id}/chats"