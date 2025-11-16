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
@app.get("/api/register", response_class=HTMLResponse)
async def show_registration_page(request: Request):
    """
    Отображает страницу регистрации с формой.
    """
    return templates.TemplateResponse("register.html", {"request": request})


# --- Эндпоинт для отображения формы входа ---
@app.get("/api/login", response_class=HTMLResponse)
async def show_login_page(request: Request):
    """
    Отображает страницу входа с формой.
    """
    return templates.TemplateResponse("login.html", {"request": request})


# --- Эндпоинт для обработки данных формы регистрации ---
@app.post("/api/register_handler")
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
@app.post("/api/login_handler")
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
