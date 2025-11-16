from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "model"]
    content: str
    timestamp: str

class Chat(BaseModel):
    chat_id: str
    company_id: str
    user_id: str
    type: Literal["marketing", "management", "finance", "helper"]
    title: str
    messages: List[ChatMessage]

class ChatCreate(BaseModel):
    user_id: str
    type: Literal["marketing", "management", "finance", "helper"]
    title: str

class ChatRename(BaseModel):
    title: str

class ChatMeta(BaseModel):
    id: str
    company_id: str
    user_id: str
    title: str
    type: Literal["marketing", "management", "finance", "helper"]
    filepath: str

class Company(BaseModel):
    company_id: str
    name: str
    description: str

class CompanyCreate(BaseModel):
    name: str
    description: str = ""

class ContextUpdate(BaseModel):
    content: str