// --- Базовый URL и Типы ---

const API_URL = 'https://vavilonus10.ru/api';

export type Company = {
  id: number;
  company_name: string;
  director_id: number;
  inn: number; // ИНН компании
  folder_path: string;
  emploees_inn: number[]; // ИНН сотрудников
};

export type CompanyCreateBody = Omit<Company, 'id'>;
export type CompanyUpdateBody = Partial<CompanyCreateBody>;

export type Task = {
  task_id: number;
  task_name: string;
  inn_worker?: number; // ИНН исполнителя (добавлено для PUT/отображения)
  deadline: string; // Формат 'YYYY-MM-DD'
  task_body: string;
  complete: boolean;
};

export type TaskCreateBody = Omit<Task, 'task_id' | 'inn_worker'>;
export type TaskUpdateBody = Partial<Omit<Task, 'task_id'>>;


/**
 * Вспомогательная функция для обработки ответа API
 * @param response Ответ от fetch
 * @param expectedStatus Ожидаемый успешный статус
 */
const handleResponse = async (response: Response, expectedStatus: number) => {
    if (response.status === expectedStatus) {
        // Успешный ответ (200, 201, 204), но 204 (No Content) не возвращает тело
        if (response.status === 204 || response.status === 200 && response.headers.get('content-length') === '0') {
            return {}; // Для DELETE, где тело не ожидается
        }
        return response.json();
    }

    // Обработка ошибок
    let errorDetail = {};
    try {
        errorDetail = await response.json();
    } catch {
        // Если тело не является JSON (например, при 500), игнорируем
    }

    let message = `API Error: Status ${response.status}.`;
    
    // Интерпретация статусов по документации:
    if (response.status === 404) {
        message = 'Объект не найден (404 Not Found).';
        // Добавление специфики, если это возможно, например, из errorDetail
        if (JSON.stringify(errorDetail).includes('director')) {
             message = "404 Not Found — директор (пользователь) не найден.";
        } else if (JSON.stringify(errorDetail).includes('company')) {
             message = "404 Not Found — компания не найдена.";
        } else if (JSON.stringify(errorDetail).includes('task')) {
             message = "404 Not Found — задача не найдена.";
        }
    } else if (response.status === 500) {
        message = 'Внутренняя ошибка сервера (500 Internal Server Error).';
    }

    // Выбрасываем объект ошибки, который можно поймать в Zustand
    throw { status: response.status, message: message, details: errorDetail };
};

// (Добавлено) GET /api/compans/ - Получить все компании
export const fetchCompanies = async (): Promise<Company[]> => {
    const response = await fetch(`${API_URL}/compans/`);
    // Ожидаем 200 OK
    return handleResponse(response, 200);
};

// -------------------
// API для Компаний (Companies)
// -------------------

// 1. POST /api/compans/ - Создать компанию
export const createCompany = async (body: CompanyCreateBody): Promise<Company> => {
    const response = await fetch(`${API_URL}/compans/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    // Ожидаем 201 Created
    return handleResponse(response, 201);
};

// 2. PUT /api/compans/{id} - Обновить компанию
export const updateCompany = async (id: number, body: CompanyUpdateBody): Promise<Company> => {
    const response = await fetch(`${API_URL}/compans/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    // Ожидаем 200 OK
    return handleResponse(response, 200);
};


// -------------------
// API для Задач (Tasks)
// -------------------

// (Добавлено) GET /api/tasks/ - Получить все задачи
export const fetchTasks = async (): Promise<Task[]> => {
    const response = await fetch(`${API_URL}/tasks/`);
    // Ожидаем 200 OK
    return handleResponse(response, 200);
};

// 1. POST /api/tasks/?inn={inn} - Создать задачу
export const createTask = async (inn: number, body: TaskCreateBody): Promise<Task> => {
    // Параметр inn передается как query-параметр
    const response = await fetch(`${API_URL}/tasks/?inn=${inn}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    // Ожидаем 201 Created
    return handleResponse(response, 201);
};

// 2. DELETE /api/tasks/{task_id} - Удалить задачу
export const deleteTask = async (taskId: number): Promise<void> => {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
    });
    // Ожидаем 200 OK
    // Мы возвращаем void, поэтому handleResponse должен вернуть пустой объект
    await handleResponse(response, 200);
};

// 3. PUT /api/tasks/{task_id} - Обновить задачу
export const updateTask = async (taskId: number, body: TaskUpdateBody): Promise<Task> => {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    // Ожидаем 200 OK
    return handleResponse(response, 200);
};