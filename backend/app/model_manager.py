import requests
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ModelManager:
    def __init__(self, base_url: str = "http://ai-model:11434"):
        self.base_url = base_url
    
    def chat(self, messages: List[Dict], model: str = None) -> str:
        """Отправка сообщений в модель"""
        try:
            payload = {
                "messages": messages,
                "model": model or "qwen2.5:0.5b-instruct",
                "stream": False
            }
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json()["message"]
            else:
                logger.error(f"Ошибка модели: {response.text}")
                return "Извините, произошла ошибка при обработке запроса."
                
        except Exception as e:
            logger.error(f"Ошибка соединения с моделью: {e}")
            return "Ошибка соединения с ИИ моделью."
    
    def health_check(self) -> bool:
        """Проверка доступности модели"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
