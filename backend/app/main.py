from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.responses import HTMLResponse, JSONResponse
from app.model_manager import ModelManager
import uvicorn
import socket
import os
from typing import Dict, Any

app = FastAPI(
    title="Business Assistant API",
    description="API для бизнес-помощника с ИИ",
    version="1.0.0"
)

# Инициализация менеджера моделей
model_manager = ModelManager("http://ai-model:8001")  # Docker service name


@app.get("/")
async def read_root():
    """Главная страница"""
    model_status = model_manager.health_check()
    available_models = model_manager.get_available_models()
    
    return  (
        {
            "hostname": socket.gethostname(),
            "domain": "vm247670.hosted-by-robovps.com",
            "model_status": "Online" if model_status else "Offline",
            "available_models": available_models
        }
    )

@app.post("/api/chat")
async def chat_endpoint(data: Dict[str, Any]):
    """Эндпоинт для чата с ИИ"""
    user_message = data["message"].strip()
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")
    
    # Подготавливаем сообщения для модели
    messages = [
        {
            "role": "system",
            "content": "Ты - полезный помощник для малого бизнеса в России. Отвечай точно и по делу."
        },
        {
            "role": "user", 
            "content": user_message
        }
    ]
    
    # Получаем ответ от модели
    try:
        ai_response = model_manager.chat(messages)
        
        return JSONResponse(content={
            "answer": ai_response,
            "status": "success",
            "model": "qwen2.5:0.5b-instruct"
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Ошибка при обращении к ИИ модели: {str(e)}"
        )

@app.get("/api/health")
async def health_check():
    """Проверка здоровья всей системы"""
    model_health = model_manager.health_check()
    
    return {
        "status": "healthy" if model_health else "degraded",
        "server": socket.gethostname(),
        "model_service": "online" if model_health else "offline"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )