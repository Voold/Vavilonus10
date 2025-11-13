from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import time
from typing import List, Optional
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Model Proxy API",
    description="Прокси для взаимодействия с ИИ моделью",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели запросов/ответов
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "qwen2.5:0.5b-instruct"
    temperature: float = 0.7
    max_tokens: Optional[int] = 1000
    stream: bool = False

class ChatResponse(BaseModel):
    message: str
    model: str
    usage: dict
    processing_time: float

class HealthResponse(BaseModel):
    status: str
    model: str
    models_available: List[str]

# Конфигурация
OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME = "qwen2.5:0.5b-instruct"

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Проверка здоровья модели"""
    try:
        # Проверяем доступность Ollama
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        if response.status_code == 200:
            models = response.json().get('models', [])
            model_names = [model['name'] for model in models]
            
            return HealthResponse(
                status="healthy",
                model=MODEL_NAME,
                models_available=model_names
            )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
    
    return HealthResponse(
        status="unhealthy",
        model=MODEL_NAME,
        models_available=[]
    )

@app.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """Основной endpoint для чата с моделью"""
    start_time = time.time()
    
    try:
        # Подготовка запроса для Ollama
        ollama_payload = {
            "model": request.model,
            "messages": [msg.dict() for msg in request.messages],
            "stream": request.stream,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens
            }
        }
        
        logger.info(f"Отправка запроса к модели {request.model}")
        
        if request.stream:
            # Стриминг ответа
            return await handle_streaming_response(ollama_payload, start_time)
        else:
            # Обычный ответ
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=ollama_payload,
                timeout=60
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Ошибка модели: {response.text}"
                )
            
            result = response.json()
            processing_time = time.time() - start_time
            
            return ChatResponse(
                message=result['message']['content'],
                model=result['model'],
                usage={
                    "prompt_tokens": len(request.messages),
                    "completion_tokens": len(result['message']['content'].split()),
                    "total_tokens": len(request.messages) + len(result['message']['content'].split())
                },
                processing_time=round(processing_time, 2)
            )
            
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="Таймаут запроса к модели")
    except Exception as e:
        logger.error(f"Ошибка при обработке запроса: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_streaming_response(payload: dict, start_time: float):
    """Обработка стримингового ответа"""
    # Для стриминга возвращаем SSE или WebSocket
    # Здесь упрощенная реализация
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json=payload,
        stream=True,
        timeout=60
    )
    
    full_response = ""
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            if 'message' in data:
                full_response += data['message']['content']
    
    processing_time = time.time() - start_time
    
    return ChatResponse(
        message=full_response,
        model=payload['model'],
        usage={
            "prompt_tokens": len(payload['messages']),
            "completion_tokens": len(full_response.split()),
            "total_tokens": len(payload['messages']) + len(full_response.split())
        },
        processing_time=round(processing_time, 2)
    )

@app.post("/generate")
async def generate_text(prompt: str, max_tokens: int = 500):
    """Упрощенный endpoint для генерации текста"""
    try:
        payload = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens
            }
        }
        
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "text": result['response'],
                "model": result['model'],
                "tokens_used": result.get('total_duration', 0)
            }
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models():
    """Список доступных моделей"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )