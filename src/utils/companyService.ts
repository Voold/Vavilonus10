/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosResponse } from 'axios';
import { protectedApi } from '../api/api';

// --- Типы данных (Interfaces) ---

export interface Company {
    id: string;
    name: string;
    description: string;
}

export type ChatType = 'marketing' | 'management' | 'finance' | 'helper';

export interface Chat {
    id: string;
    user_id: string;
    type: ChatType;
    title: string;
}

export interface ChatCreateData {
    user_id: string;
    type: ChatType;
    title: string;
}

export interface Document {
    filename: string;
    // Добавьте другие поля, если они есть
}


// --- API-методы ---
export const companyService = {

    // --- Компании ---

    async fetchCompanies(): Promise<AxiosResponse<Company[]>> {
        return protectedApi.get<Company[]>('/companies');
    },

  async createCompany(name: string, description: string): Promise<AxiosResponse<Company>> {
      const formPayload = new FormData();
      formPayload.append('name', name);
      formPayload.append('description', description);

      return protectedApi.post<Company>('/companies', formPayload, {
          headers: {
              'Content-Type': undefined, 
          },
      });
  },

    async getCompanyInfo(companyId: string): Promise<AxiosResponse<Company>> {
        return protectedApi.get<Company>(`/companies/${companyId}`);
    },
    
    async addCompanyContext(companyId: string, contextData: any): Promise<AxiosResponse<void>> {
        return protectedApi.post<void>(`/companies/${companyId}/context/`, contextData);
    },
    
    // --- Чаты ---

    async fetchUserChats(companyId: string, userId: string): Promise<AxiosResponse<Chat[]>> {
        return protectedApi.get<Chat[]>(`/companies/${companyId}/users/${userId}/chats`);
    },

    async createChat(companyId: string, data: ChatCreateData): Promise<AxiosResponse<Chat>> {
        return protectedApi.post<Chat>(`/companies/${companyId}/chats`, data);
    },

    async deleteChat(companyId: string, chatId: string): Promise<AxiosResponse<void>> {
        return protectedApi.delete<void>(`/companies/${companyId}/chats/${chatId}`);
    },

    async renameChat(companyId: string, chatId: string, newTitle: string): Promise<AxiosResponse<void>> {
        return protectedApi.put<void>(`/companies/${companyId}/chats/${chatId}/rename`, { title: newTitle });
    },

    async exportChatHistory(companyId: string, chatId: string): Promise<AxiosResponse<Blob>> {
        // responseType: 'blob' необходим для скачивания файлов
        return protectedApi.get<Blob>(`/companies/${companyId}/chats/${chatId}/export`, { responseType: 'blob' });
    },

    // --- Документы ---
    
    async fetchCompanyDocuments(companyId: string): Promise<AxiosResponse<Document[]>> {
        return protectedApi.get<Document[]>(`/companies/${companyId}/docs/`);
    },

    async uploadDocument(companyId: string, file: File): Promise<AxiosResponse<void>> {
        const formData = new FormData();
        formData.append('file', file);
        
        // Важно: нужно изменить Content-Type на 'multipart/form-data'
        return protectedApi.post<void>(`/companies/${companyId}/docs/upload/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    async downloadDocument(companyId: string, filename: string): Promise<AxiosResponse<Blob>> {
        // responseType: 'blob' необходим для скачивания файлов
        return protectedApi.get<Blob>(`/companies/${companyId}/docs/download/${filename}`, { responseType: 'blob' });
    },
};