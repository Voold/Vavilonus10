from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

    async def send_message(self, message: dict, connection_id: str):
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            await websocket.send_text(json.dumps(message, ensure_ascii=False))

manager = ConnectionManager()