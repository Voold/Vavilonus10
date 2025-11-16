import aiohttp
import json
import logging
import os
from .database import load_chat, append_message_to_chat, get_company_context
from .file_utils import load_company_documents
from .models import ChatMessage
import uuid
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

# Конфигурация из переменных окружения
AI_URL = os.getenv("AI_URL", "http://ai-model:11434")
USE_MOCK_AI = os.getenv("USE_MOCK_AI", "false").lower() == "true"

async def generate_ai_response(company_id: str, chat_id: str, user_message: str):
    """Генерирует ответ ИИ для конкретной компании и чата"""
    
    # Если включен режим заглушки, возвращаем тестовый ответ
    if USE_MOCK_AI:
        logger.info("Используется заглушка ИИ")
        return f"Это тестовый ответ от ИИ для компании {company_id}. Ваше сообщение: '{user_message}'. В реальном сценарии здесь был бы ответ от AI модели на основе контекста компании и истории чата."
    
    # Загружаем актуальную историю чата
    chat = load_chat(company_id, chat_id)
    if not chat:
        raise Exception("Чат не найден")
    
    # Загружаем документы и контекст компании
    company_documents = load_company_documents(company_id)
    company_context = get_company_context(company_id)
    
    # Формируем системный промпт с контекстами
    system_prompt_parts = [
        "КОНТЕКСТ КОМПАНИИ (соблюдай всегда):",
        company_context
    ]
    
    if company_documents:
        system_prompt_parts.extend([
            "\nДОКУМЕНТЫ КОМПАНИИ (используй эту информацию при ответах):",
            company_documents
        ])
    
    system_prompt_parts.extend([
        "\nТы - ассистент, который всегда следует контексту компании.",
        "Отвечай на основе предоставленной информации и истории диалога ниже.",
        "Если в документах компании есть релевантная информация - обязательно используй ее в ответе."
    ])
    
    system_prompt = "\n".join(system_prompt_parts)
    
    # Формируем историю диалога для ИИ
    messages = [{"role": "system", "content": system_prompt}]
    
    # Добавляем историю диалога
    for msg in chat.messages[-10:]:  # Берем последние 10 сообщений для контекста
        messages.append({"role": msg.role, "content": msg.content})
    
    # Добавляем новое сообщение пользователя
    messages.append({"role": "user", "content": user_message})
    
    logger.info(f"Отправка запроса к ИИ для компании {company_id} с {len(messages)} сообщениями в истории")
    
    # Подготавливаем запрос к ИИ (Ollama совместимый формат)
    ai_request = {
        "model": os.getenv("MODEL",""),  # Модель по умолчанию для Ollama
        "messages": messages,
        "stream": False
    }
    
    try:
        logger.info(f"Попытка подключения к AI сервису: {AI_URL}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{AI_URL}/api/chat",
                json=ai_request,
                timeout=60
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Ошибка ИИ сервиса (status {response.status}): {error_text}")
                    raise Exception(f"Ошибка ИИ (status {response.status}): {error_text}")
                
                # Получаем полный ответ
                data = await response.json()
                logger.info("Успешно получили ответ от AI сервиса")
                
                # Извлекаем текст ответа из формата Ollama
                if 'message' in data and 'content' in data['message']:
                    return data['message']['content']
                else:
                    logger.warning(f"Неожиданная структура ответа ИИ: {data}")
                    return "Извините, не удалось обработать ответ от ИИ."
    
    except asyncio.TimeoutError:
        logger.error("Таймаут при обращении к ИИ")
        raise Exception("Таймаут при обращении к ИИ сервису")
    except aiohttp.ClientConnectorError as e:
        logger.error(f"Ошибка подключения к AI сервису: {e}")
        raise Exception(f"Не удалось подключиться к AI сервису по адресу {AI_URL}. Проверьте, запущен ли сервис.")
    except Exception as e:
        logger.error(f"Неизвестная ошибка при обращении к ИИ: {e}")
        raise Exception(f"Ошибка соединения с ИИ: {str(e)}")

# Функция для проверки здоровья AI сервиса
async def check_ai_health():
    """Проверка доступности AI сервиса"""
    if USE_MOCK_AI:
        return {"status": "mock", "message": "Используется режим заглушки"}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{AI_URL}/api/tags", timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"status": "healthy", "data": data}
                else:
                    return {"status": "unhealthy", "error": f"Status code: {response.status}"}
    except Exception as e:
        return {"status": "error", "error": str(e)}