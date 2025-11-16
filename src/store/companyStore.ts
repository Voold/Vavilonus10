/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import type { Company, Chat, Document, ChatType } from '../utils/companyService'; 
import { companyService } from '../utils/companyService'; 
// --- Тип состояния (Store State) ---
interface CompanyState {
    companies: Company[];
    selectedCompany: Company | null;
    companyChats: Chat[];
    companyDocuments: Document[];
    currentUserId: string | null; // ID текущего пользователя
    isLoading: boolean;
    error: string | null;
}

// --- Тип действий (Store Actions) ---
interface CompanyActions {
    // Управление состоянием
    setCurrentUserId: (userId: string) => void;
    clearSelection: () => void;
    
    // Компании (API)
    fetchCompanies: () => Promise<void>;
    createCompany: (name: string, description: string) => Promise<void>;
    selectCompany: (companyId: string) => Promise<void>; // включает getCompanyInfo
    
    // Чаты (API)
    fetchUserChats: (companyId: string, userId: string) => Promise<void>;
    createChat: (companyId: string, type: ChatType, title: string) => Promise<void>;
    deleteChat: (companyId: string, chatId: string) => Promise<void>;
    renameChat: (companyId: string, chatId: string, newTitle: string) => Promise<void>;
    exportChatHistory: (companyId: string, chatId: string) => Promise<void>; // скачивание
    
    // Документы (API)
    fetchCompanyDocuments: (companyId: string) => Promise<void>;
    uploadDocument: (companyId: string, file: File) => Promise<void>;
    downloadDocument: (companyId: string, filename: string) => Promise<void>;
}


// --- Создание хранилища (Store) ---
export const useCompanyStore = create<CompanyState & CompanyActions>((set, get) => ({
    // Состояние
    companies: [],
    selectedCompany: null,
    companyChats: [],
    companyDocuments: [],
    currentUserId: 'user-123', // TODO: Заменить на реальный ID после логина
    isLoading: false,
    error: null,

    // --- Действия ---
    
    setCurrentUserId: (userId) => set({ currentUserId: userId }),
    
    clearSelection: () => set({ selectedCompany: null, companyChats: [], companyDocuments: [] }),

    // --- Компании (API) ---

    fetchCompanies: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await companyService.fetchCompanies();
            set({ companies: response.data, isLoading: false });
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка загрузки компаний' });
        }
    },

    createCompany: async (name, description) => {
        set({ isLoading: true, error: null });
        try {
            const response = await companyService.createCompany(name, description);
            set(state => ({
                companies: [...state.companies, response.data],
                isLoading: false
            }));
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка создания компании' });
        }
    },

    selectCompany: async (companyId) => {
        set({ isLoading: true, error: null, selectedCompany: null });
        try {
            const response = await companyService.getCompanyInfo(companyId);
            set({ selectedCompany: response.data, isLoading: false });
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || `Ошибка загрузки компании ${companyId}` });
        }
    },

    // --- Чаты (API) ---

    fetchUserChats: async (companyId, userId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await companyService.fetchUserChats(companyId, userId);
            set({ companyChats: response.data, isLoading: false });
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка загрузки чатов' });
        }
    },
    
    createChat: async (companyId, type, title) => {
        set({ isLoading: true, error: null });
        const userId = get().currentUserId;
        if (!userId) {
            set({ isLoading: false, error: 'User ID not set' });
            return;
        }
        try {
            const data = { user_id: userId, type, title };
            const response = await companyService.createChat(companyId, data);
            set(state => ({
                companyChats: [...state.companyChats, response.data],
                isLoading: false,
            }));
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка создания чата' });
        }
    },
    
    deleteChat: async (companyId, chatId) => {
        set({ isLoading: true, error: null });
        try {
            await companyService.deleteChat(companyId, chatId);
            set(state => ({
                companyChats: state.companyChats.filter(chat => chat.id !== chatId),
                isLoading: false,
            }));
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка удаления чата' });
        }
    },
    
    renameChat: async (companyId, chatId, newTitle) => {
        set({ isLoading: true, error: null });
        try {
            await companyService.renameChat(companyId, chatId, newTitle);
            set(state => ({
                companyChats: state.companyChats.map(chat => 
                    chat.id === chatId ? { ...chat, title: newTitle } : chat
                ),
                isLoading: false,
            }));
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка переименования чата' });
        }
    },
    
    exportChatHistory: async (companyId, chatId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await companyService.exportChatHistory(companyId, chatId);
            // Создание ссылки для скачивания (стандартный подход)
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `chat_export_${chatId}.docx`); // Задаем имя файла
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            set({ isLoading: false });
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка экспорта чата' });
        }
    },

    // --- Документы (API) ---

    fetchCompanyDocuments: async (companyId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await companyService.fetchCompanyDocuments(companyId);
            set({ companyDocuments: response.data, isLoading: false });
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка загрузки документов' });
        }
    },
    
    uploadDocument: async (companyId, file) => {
        set({ isLoading: true, error: null });
        try {
            await companyService.uploadDocument(companyId, file);
            // После успешной загрузки обновляем список документов
            await get().fetchCompanyDocuments(companyId); 
            set({ isLoading: false });
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка загрузки документа' });
        }
    },

    downloadDocument: async (companyId, filename) => {
        set({ isLoading: true, error: null });
        try {
            const response = await companyService.downloadDocument(companyId, filename);
            // Создание ссылки для скачивания (стандартный подход)
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename); 
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            set({ isLoading: false });
        } catch (e: any) {
            set({ isLoading: false, error: e.response?.data?.message || 'Ошибка скачивания документа' });
        }
    }
}));