import sqlite3
from typing import Optional, Dict
from datetime import datetime # ИСПРАВЛЕНИЕ: Добавлен импорт datetime
from datetime import datetime

DATABASE_NAME = "vk_auth.db"


def get_db_connection():
    """Возвращает соединение с базой данных SQLite."""
    conn = sqlite3.connect(DATABASE_NAME)
    # Позволяет получать результат запроса как словарь (Dict)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_db():
    """Создает таблицу users, если она не существует."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Создаем таблицу с обязательными полями VK и новыми полями ИНН, Роль.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            vk_id TEXT UNIQUE NOT NULL,
            email TEXT,
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            avatar_url TEXT,
            sex INTEGER,
            birthday TEXT,
            verified BOOLEAN,
            -- Новые атрибуты
            inn TEXT DEFAULT '',
            role TEXT DEFAULT 'сотрудник', -- По умолчанию 'сотрудник'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print("INFO: Database initialized successfully.")


def save_or_update_user(user_data: Dict) -> Optional[int]:
    """
    Сохраняет или обновляет данные пользователя в БД на основе vk_id.
    Возвращает внутренний ID пользователя.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    vk_id = str(user_data.get('user_id'))

    # 1. Попытка найти существующего пользователя
    cursor.execute("SELECT id, inn, role FROM users WHERE vk_id = ?", (vk_id,))
    existing_user = cursor.fetchone()

    # Основные данные, которые всегда обновляются
    common_data = {
        'vk_id': vk_id,
        'email': user_data.get('email'),
        'first_name': user_data.get('first_name'),
        'last_name': user_data.get('last_name'),
        'full_name': user_data.get('full_name'),
        'avatar_url': user_data.get('avatar'),
        'sex': user_data.get('sex'),
        'birthday': user_data.get('birthday'),
        'verified': user_data.get('verified'),
        'updated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    if existing_user:
        # 2. Пользователь найден - обновляем данные
        # ИНН и Роль не обновляются, если они были заданы вручную в БД,
        # так как VK ID их не предоставляет.

        set_clause = ', '.join([f'{k} = :{k}' for k in common_data.keys() if k != 'vk_id'])

        cursor.execute(f"""
            UPDATE users SET {set_clause} WHERE vk_id = :vk_id
        """, {**common_data, 'vk_id': vk_id})

        conn.commit()
        internal_id = existing_user['id']
        print(f"INFO: User {vk_id} updated in DB. Internal ID: {internal_id}")

    else:
        # 3. Пользователь не найден - создаем новую запись
        # Новые поля inn и role автоматически получат значения по умолчанию ('', 'сотрудник')

        columns = ', '.join(common_data.keys())
        placeholders = ', '.join([f':{k}' for k in common_data.keys()])

        cursor.execute(f"""
            INSERT INTO users ({columns}) VALUES ({placeholders})
        """, common_data)

        conn.commit()
        internal_id = cursor.lastrowid
        print(f"INFO: New user {vk_id} created in DB. Internal ID: {internal_id}")

    conn.close()
    return internal_id


def get_user_by_vk_id(vk_id: str) -> Optional[Dict]:
    """Получает полную информацию о пользователе из БД."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE vk_id = ?", (vk_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def get_user_by_internal_id(internal_id: str) -> Optional[Dict]:
    """Получает полную информацию о пользователе из БД по внутреннему ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Обратите внимание, что ID в базе INTEGER, но Python передает его как str из JWT
    cursor.execute("SELECT * FROM users WHERE id = ?", (internal_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None

if __name__ == '__main__':
    # Тестовый запуск для создания базы
    initialize_db()