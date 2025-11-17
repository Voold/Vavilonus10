from fastapi import FastAPI, HTTPException, status, Request  # <-- Импорт Request
from starlette.responses import JSONResponse, RedirectResponse
import httpx
from dotenv import load_dotenv
import os
import logging
import secrets
import hashlib
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

# --- Импорты для JWT ---
from jose import jwt
from jose.exceptions import JWTError

# --- Импорт для работы с БД ---
# Убедитесь, что database.py содержит get_user_by_internal_id
from database import initialize_db, save_or_update_user, get_user_by_vk_id, get_user_by_internal_id

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Конфигурация ---
load_dotenv()
app = FastAPI(title="VKAuthService with JWT and SQLite")

# --- JWT Конфигурация ---
JWT_SECRET_KEY = os.getenv('VK_CLIENT_SECRET', 'super-secret-key-fallback')
ALGORITHM = "HS256"

# Сроки действия токенов
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Параметры VK ID
PUBLIC_HTTPS_URL = os.getenv('PUBLIC_HTTPS_URL', 'http://127.0.0.1:8001')
VK_CLIENT_ID = os.getenv('VK_CLIENT_ID')
VK_CLIENT_SECRET = os.getenv('VK_CLIENT_SECRET')
REDIRECT_URI = f'{PUBLIC_HTTPS_URL}/auth/vk/callback'

# Эндпоинты VK ID
VK_AUTHORIZE_URL = 'https://id.vk.ru/authorize'
VK_TOKEN_URL = 'https://id.vk.ru/oauth2/auth'
VK_USER_INFO_URL = 'https://id.vk.ru/oauth2/user_info'

# Scope для получения email и телефона
VK_SCOPE = 'email phone'


# --- Инициализация БД при старте ---
@app.on_event("startup")
async def startup_event():
    """Вызывается при запуске приложения."""
    initialize_db()
# ------------------------------------


# --- Вспомогательные функции для PKCE и JWT ---

def generate_code_verifier() -> str:
    """Генерирует code_verifier для PKCE"""
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')


def generate_code_challenge(verifier: str) -> str:
    """Генерирует code_challenge из code_verifier методом S256"""
    digest = hashlib.sha256(verifier.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')


def generate_state() -> str:
    """Генерирует случайный state"""
    return secrets.token_urlsafe(32)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создает Access Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "token_type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создает Refresh Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "token_type": "refresh", "jti": secrets.token_urlsafe(16)})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Декодирует JWT и проверяет его валидность"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный или просроченный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )


# --- Эндпоинты ---

@app.get('/')
def home():
    """Возвращает JSON-сообщение о статусе сервиса"""
    return {"message": "VKAuthService запущен. Для авторизации используйте /auth/vk/login"}


@app.get('/auth/vk/login')
async def login_via_vk():
    """
    Шаг 1: Возвращает URL для перенаправления и PKCE-параметры.
    """
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    state = generate_state()

    auth_params = {
        'response_type': 'code',
        'client_id': VK_CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': VK_SCOPE,
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256'
    }

    auth_url = f"{VK_AUTHORIZE_URL}?{'&'.join([f'{k}={v}' for k, v in auth_params.items()])}"

    logger.info(f"Returning VK ID Auth URL: {auth_url}")

    return {
        "auth_url": auth_url,
        "code_verifier": code_verifier,
        "state": state
    }


@app.get('/auth/vk/callback')
async def vk_callback(
        request: Request,  # <-- ИСПРАВЛЕНИЕ: Добавлен request
        code: Optional[str] = None,
        state: Optional[str] = None,
        error: Optional[str] = None
):
    """
    Шаг 2: Принимает callback от VK ID. Возвращает code и state.
    """

    if error:
        error_description = request.query_params.get('error_description', 'Неизвестная ошибка')
        logger.error(f"VK ID Authorization Error: {error} - {error_description}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": f"Ошибка авторизации: {error_description}"}
        )

    if code and state:
        return {
            "message": "Callback успешный. Используйте /auth/vk/exchange для получения JWT.",
            "code": code,
            "state": state
        }

    return {"detail": "Некорректный вызов callback"}


@app.post('/auth/vk/exchange')
async def vk_exchange(
        code: str,
        state: str,
        code_verifier: str
):
    """
    Шаг 3: Обмен кода на Access Token и Refresh Token, сохранение в БД.
    """

    # 1. Обмен кода на токен VK ID
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_data = {
                'grant_type': 'authorization_code',
                'code': code,
                'code_verifier': code_verifier,
                'redirect_uri': REDIRECT_URI,
                'client_id': VK_CLIENT_ID,
                'state': state
            }

            response = await client.post(
                VK_TOKEN_URL,
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            response.raise_for_status()
            token_response = response.json()

            vk_access_token = token_response.get('access_token')
            vk_user_id = token_response.get('user_id')

            if not vk_access_token or not vk_user_id:
                raise ValueError("Отсутствует access_token или user_id в ответе VK ID.")

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP Error during token exchange: {e.response.text}")
        return JSONResponse(
            status_code=e.response.status_code,
            content={"detail": f"Ошибка обмена кода на токен VK ID: {e.response.text}"}
        )
    except Exception as e:
        logger.error(f"General error during token exchange: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Внутренняя ошибка при обмене кода: {e}"}
        )

    # 2. Получение информации о пользователе VK
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            user_info_data = {
                'client_id': VK_CLIENT_ID,
                'access_token': vk_access_token
            }

            response = await client.post(
                VK_USER_INFO_URL,
                data=user_info_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            response.raise_for_status()
            user_info_response = response.json()
            user_data = user_info_response.get('user', {})

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP Error during user info request: {e.response.text}")
        return JSONResponse(
            status_code=e.response.status_code,
            content={"detail": f"Ошибка получения информации о пользователе: {e.response.text}"}
        )
    except Exception as e:
        logger.error(f"General error during user info request: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Внутренняя ошибка при запросе данных пользователя: {e}"}
        )

    # 3. Сохранение и обновление данных в SQLite
    user_data_from_vk = {
        "user_id": user_data.get('user_id'),
        "first_name": user_data.get('first_name'),
        "last_name": user_data.get('last_name'),
        "full_name": f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}",
        "email": user_data.get('email'),
        "phone": user_data.get('phone'),
        "avatar": user_data.get('avatar'),
        "sex": user_data.get('sex'),
        "birthday": user_data.get('birthday'),
        "verified": user_data.get('verified'),
    }

    internal_id = save_or_update_user(user_data_from_vk)
    full_db_user_data = get_user_by_internal_id(str(internal_id))  # Используем исправленный импорт

    # 4. Генерация наших JWT токенов
    user_payload = {
        "sub": str(internal_id),
        "vk_id": str(user_data.get('user_id')),
        "email": full_db_user_data.get('email'),
        "full_name": full_db_user_data.get('full_name'),
        "role": full_db_user_data.get('role')
    }

    access_token = create_access_token(user_payload)
    refresh_token = create_refresh_token({"sub": str(internal_id)})

    # 5. Финальный ответ фронтенду
    return {
        "message": "Авторизация успешна. Выданы JWT токены.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_token": refresh_token,
        "user": {
            "internal_id": internal_id,
            "vk_id": full_db_user_data.get('vk_id'),
            "email": full_db_user_data.get('email'),
            "full_name": full_db_user_data.get('full_name'),
            "role": full_db_user_data.get('role'),
            "inn": full_db_user_data.get('inn')
        }
    }


@app.post('/auth/refresh')
async def refresh_tokens(refresh_token: str):
    """
    Обмен Refresh Token на новую пару Access и Refresh токенов.
    """

    # 1. Декодируем и проверяем Refresh Token
    try:
        payload = decode_token(refresh_token)
        if payload.get("token_type") != "refresh":
            raise JWTError("Ожидался Refresh Token.")

        user_id = payload.get("sub")  # internal_id
        if not user_id:
            raise JWTError("Отсутствует ID пользователя в токене.")

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Недействительный Refresh Token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Получаем данные пользователя по внутреннему ID из БД
    db_user = get_user_by_internal_id(user_id)  # Используем исправленный импорт

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден в базе данных.",
        )

    # 3. Генерируем новые токены
    new_access_payload = {
        "sub": user_id,
        "vk_id": db_user['vk_id'],
        "full_name": db_user['full_name'],
        "role": db_user['role']
    }

    new_access_token = create_access_token(new_access_payload)
    new_refresh_token = create_refresh_token({"sub": user_id})

    # 4. Возвращаем новую пару
    return {
        "message": "Токены успешно обновлены.",
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_token": new_refresh_token
    }


# --- Пример защищённого эндпоинта ---
@app.get('/api/protected')
async def protected_route(request: Request):
    """
    Пример защищенного маршрута, требующего Access Token.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется токен Bearer",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth_header.split(' ')[1]

    try:
        payload = decode_token(access_token)
        if payload.get("token_type") != "access":
            raise JWTError("Ожидался Access Token.")

        user_id = payload.get("sub")

        return {
            "message": "Доступ разрешен",
            "user_id": user_id,
            "role": payload.get("role"),
            "full_name": payload.get("full_name"),
            "token_payload": payload
        }
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)