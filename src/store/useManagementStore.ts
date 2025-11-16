/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
    fetchCompanies,
    fetchTasks,
    createCompany,
    updateCompany,
    createTask,
    deleteTask,
    updateTask
} from '../api/managementAPI';
import type {
    Company,
    Task,
    CompanyCreateBody,
    CompanyUpdateBody,
    TaskCreateBody,
    TaskUpdateBody,
} from '../api/managementAPI';

// Тип для состояния
interface WorkspaceState {
    companies: Company[];
    tasks: Task[];
    isLoading: boolean;
    error: string | null;
    isDirector: boolean; // Статус пользователя
    currentDirectorId: number;
}

// Тип для действий
interface WorkspaceActions {
    // Общие
    loadInitialData: () => Promise<void>;
    clearError: () => void;
    
    // Компании
    handleCreateCompany: (body: CompanyCreateBody) => Promise<void>;
    handleUpdateCompany: (id: number, body: CompanyUpdateBody) => Promise<void>;

    // Задачи
    handleCreateTask: (inn: number, body: TaskCreateBody) => Promise<void>;
    handleDeleteTask: (taskId: number) => Promise<void>;
    handleUpdateTask: (taskId: number, body: TaskUpdateBody) => Promise<void>;
}

// Создание хранилища Zustand
export const useManagementStore = create<WorkspaceState & WorkspaceActions>((set, get) => ({
    companies: [],
    tasks: [],
    isLoading: false,
    error: null,
    isDirector: true, // Имитируем, что текущий пользователь - директор (ID=1)
    currentDirectorId: 1,

    clearError: () => set({ error: null }),

    loadInitialData: async () => {
        set({ isLoading: true, error: null });
        try {
            const [companiesData, tasksData] = await Promise.all([fetchCompanies(), fetchTasks()]);
            set({ companies: companiesData, tasks: tasksData, isLoading: false });
        } catch (err) {
            console.error(err);
            set({ error: "Не удалось загрузить начальные данные.", isLoading: false });
        }
    },

    // --- Компании ---

    handleCreateCompany: async (body) => {
        if (!get().isDirector) return; // Проверка статуса
        set({ isLoading: true, error: null });
        try {
            const newCompany = await createCompany(body);
            set(state => ({
                companies: [...state.companies, newCompany],
                isLoading: false,
            }));
        } catch (err: any) {
            const errorMessage = err.status === 404 ? err.message : "Ошибка при создании компании.";
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
        }
    },

    handleUpdateCompany: async (id, body) => {
        if (!get().isDirector) return;
        set({ isLoading: true, error: null });
        try {
            const updatedCompany = await updateCompany(id, body);
            set(state => ({
                companies: state.companies.map(c => c.id === id ? updatedCompany : c),
                isLoading: false,
            }));
        } catch (err: any) {
            const errorMessage = err.status === 404 ? err.message : "Ошибка при обновлении компании.";
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
        }
    },

    // --- Задачи ---

    handleCreateTask: async (inn, body) => {
        if (!get().isDirector) return;
        set({ isLoading: true, error: null });
        try {
            const newTask = await createTask(inn, body);
            set(state => ({
                tasks: [...state.tasks, newTask],
                isLoading: false,
            }));
        } catch (err: any) {
            const errorMessage = err.status === 404 ? err.message : "Ошибка при создании задачи.";
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
        }
    },

    handleDeleteTask: async (taskId) => {
        if (!get().isDirector) return;
        set({ isLoading: true, error: null });
        try {
            await deleteTask(taskId);
            set(state => ({
                tasks: state.tasks.filter(t => t.task_id !== taskId),
                isLoading: false,
            }));
        } catch (err: any) {
            const errorMessage = err.status === 404 ? err.message : "Ошибка при удалении задачи.";
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
        }
    },

    handleUpdateTask: async (taskId, body) => {
        if (!get().isDirector) return;
        set({ isLoading: true, error: null });
        try {
            const updatedTask = await updateTask(taskId, body);
            set(state => ({
                tasks: state.tasks.map(t => t.task_id === taskId ? updatedTask : t),
                isLoading: false,
            }));
        } catch (err: any) {
            let errorMessage = "Ошибка при обновлении задачи.";
            if (err.status === 404) {
                errorMessage = err.message;
            } else if (err.status === 500) {
                errorMessage = err.message;
            }
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
        }
    },
}));