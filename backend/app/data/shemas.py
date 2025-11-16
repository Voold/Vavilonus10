# data/shemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
import datetime


# --- Пользователи (Users) ---

class UserInn(BaseModel):
    """Схема для передачи ИНН пользователя."""
    inn: int = Field(..., description="ИНН пользователя", ge=10**10, le=10**12 - 1)


class UserBase(BaseModel):
    """Базовая схема пользователя без ID."""
    full_name: str = Field(..., min_length=1, max_length=255, description="Полное имя пользователя")
    inn: int = Field(..., description="ИНН пользователя", ge=10**10, le=10**12 - 1)
    role: Optional[Literal["worker", "director"]] = Field("worker", description="Роль пользователя")
    folder_path: Optional[str] = Field("", max_length=500, description="Путь к папке пользователя")


class UserCreate(UserBase):
    """Схема для создания пользователя."""
    # Наследует все поля от UserBase, включая обязательные full_name и inn
    # Можно добавить дополнительные поля, специфичные для создания, например, пароль
    password: Optional[str] = Field(None, description="Пароль пользователя (если передается при создании)")


class UserUpdate(BaseModel):
    """Схема для обновления пользователя. Поля опциональны."""
    full_name: Optional[str] = Field(None, max_length=255, description="Новое полное имя пользователя")
    role: Optional[Literal["worker", "director"]] = Field(None, description="Новая роль пользователя")
    folder_path: Optional[str] = Field(None, max_length=500, description="Новый путь к папке пользователя")


class UserRegistration(BaseModel):
    """Схема для регистрации пользователя через форму."""
    full_name: str = Field(..., min_length=1, max_length=255, description="Полное имя пользователя")
    password: str = Field(..., min_length=6, description="Пароль пользователя") # Минимальная длина пароля
    inn: int = Field(..., description="ИНН пользователя", ge=10**10, le=10**12 - 1)
    is_director: bool = Field(True, description="Является ли пользователь директором")


# --- Компании (Companies) ---

class CompanyId(BaseModel):
    """Схема для передачи ID компании."""
    id: int = Field(..., gt=0, description="ID компании")


class CompanyBase(BaseModel):
    """Базовая схема компании без ID."""
    company_name: str = Field(..., min_length=1, max_length=255, description="Название компании")
    director_id: int = Field(..., gt=0, description="ID директора компании")
    inn: int = Field(..., ge=10**9, le=10**12 - 1, description="ИНН компании") # ИНН компании может отличаться
    folder_path: Optional[str] = Field("", max_length=500, description="Путь к папке компании")
    emploees_inn: List[int] = Field(default_factory=list, description="Список ИНН сотрудников")


class CompanyUpdate(BaseModel):
    """Схема для обновления компании. Поля опциональны."""
    id: int = Field(..., gt=0, description="ID компании для обновления")
    company_name: Optional[str] = Field(None, max_length=255, description="Новое название компании")
    director_id: Optional[int] = Field(None, gt=0, description="Новый ID директора компании")
    inn: Optional[int] = Field(None, ge=10**9, le=10**12 - 1, description="Новый ИНН компании")
    folder_path: Optional[str] = Field(None, max_length=500, description="Новый путь к папке компании")
    emploees_inn: Optional[List[int]] = Field(None, description="Новый список ИНН сотрудников")


# --- Задачи (Tasks) ---

class TaskBase(BaseModel):
    """Базовая схема задачи без ID и ID/ИНН исполнителя."""
    task_name: str = Field(..., min_length=1, max_length=255, description="Название задачи")
    deadline: Optional[datetime.date] = Field(None, description="Дедлайн задачи")
    task_body: Optional[str] = Field("", max_length=1000, description="Описание задачи")
    complete: bool = Field(False, description="Статус выполнения задачи")


class TaskDel(BaseModel):
    """Схема для передачи ID задачи."""
    id: int = Field(..., gt=0, description="ID задачи")


class TaskUpdate(BaseModel):
    """Схема для обновления задачи. Поля опциональны."""
    id: int = Field(..., gt=0, description="ID задачи для обновления")
    task_name: Optional[str] = Field(None, description="Новое название задачи")
    inn_worker: Optional[int] = Field(None, ge=10**10, le=10**12 - 1, description="ИНН нового исполнителя")
    deadline: Optional[datetime.date] = Field(None, description="Новый дедлайн задачи")
    task_body: Optional[str] = Field(None,  description="Новое описание задачи")
    complete: Optional[bool] = Field(None, description="Новый статус выполнения задачи")
