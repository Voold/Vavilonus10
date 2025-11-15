import React, { useState, useEffect } from 'react';
import { WorkspaceCard } from '../../components/WorkspaceCard';
import { useAuthStore } from '../../store/useAuthStore'; 
import styles from '../../styles/SettingsWorkspace.module.css';
import { CheckCircle, AlertTriangle, Save, Loader } from 'lucide-react';

// Предполагаем, что этот тип импортирован из authAPI.ts
interface UserUpdate {
    inn: number;
    full_name?: string;
    role?: string;
    folder_path?: string;
}

/**
 * Страница настроек пользователя для изменения личных данных.
 */
export const SettingsWorkspace: React.FC = () => {
    // Безопасное извлечение состояния и методов из Zustand (для избежания ошибок рендера)
    const currentUser = useAuthStore(state => state.user);
    const isLoading = useAuthStore(state => state.isLoading);
    const apiError = useAuthStore(state => state.error);
    const updateUser = useAuthStore(state => state.updateUser);
    const setError = useAuthStore(state => state.setError);

    // Локальное состояние формы
    const [formData, setFormData] = useState<Omit<UserUpdate, 'inn'>>({
        full_name: currentUser.fullName || '',
        role: currentUser.role || '',
        // Добавьте folder_path, если он хранится в Zustand
        folder_path: '', 
    });

    // Состояние для уведомления об успешном сохранении
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // 1. Инициализация формы при загрузке данных пользователя
    useEffect(() => {
        if (currentUser.isLoggedIn) {
            setFormData({
                full_name: currentUser.fullName || '',
                role: currentUser.role || '',
                // folder_path: ...
            });
        }
    }, [currentUser]);

    // 2. Сброс сообщений при изменении данных
    useEffect(() => {
        setError(null);
        setSuccessMessage(null);
    }, [formData, setError]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!currentUser.inn) {
            setError("Ошибка: ИНН пользователя не определен. Невозможно обновить данные.");
            return;
        }

        // Подготовка данных для API
        const updatePayload: UserUpdate = {
            inn: currentUser.inn,
            full_name: formData.full_name,
            role: formData.role,
            folder_path: formData.folder_path,
        };
        
        // Удаляем undefined/пустые поля (кроме обязательного inn)
        Object.keys(updatePayload).forEach(key => {
            const k = key as keyof UserUpdate;
            if (updatePayload[k] === '' || updatePayload[k] === undefined) {
                delete updatePayload[k];
            }
        });
        
        try {
            await updateUser(updatePayload); 
            setSuccessMessage("Данные успешно обновлены!");
        } catch (error) {
            // Ошибка уже обработана и установлена в Zustand
            console.error("Update failed:", error);
        }
    };
    
    // Отображаем заглушку, пока данные пользователя не загружены
    if (!currentUser.isLoggedIn) {
        return (
            <WorkspaceCard title="Настройки Пользователя">
                <p className={styles.loadingText}>Загрузка данных пользователя или вы не авторизованы...</p>
            </WorkspaceCard>
        );
    }

    return (
        <WorkspaceCard title="Настройки Профиля">
            <form onSubmit={handleSubmit} className={styles.settingsForm}>
                <p className={styles.innLabel}>
                    ИНН: <span className={styles.innValue}>{currentUser.inn}</span> 
                    <span className={styles.innHint}>(ИНН изменить нельзя)</span>
                </p>

                {/* Поле ФИО */}
                <div className={styles.inputGroup}>
                    <label htmlFor="full_name" className={styles.label}>ФИО</label>
                    <input
                        id="full_name"
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className={styles.inputField}
                    />
                </div>

                {/* Поле Роль */}
                <div className={styles.inputGroup}>
                    <label htmlFor="role" className={styles.label}>Роль</label>
                    <input
                        id="role"
                        type="text"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={styles.inputField}
                    />
                </div>
                
                {/* Поле Folder Path (если оно есть) */}
                <div className={styles.inputGroup}>
                    <label htmlFor="folder_path" className={styles.label}>Путь к папке</label>
                    <input
                        id="folder_path"
                        type="text"
                        name="folder_path"
                        value={formData.folder_path}
                        onChange={handleChange}
                        className={styles.inputField}
                    />
                </div>

                {/* Сообщения о статусе */}
                {successMessage && (
                    <div className={`${styles.statusMessage} ${styles.success}`}>
                        <CheckCircle size={20} />
                        <span>{successMessage}</span>
                    </div>
                )}
                {apiError && (
                    <div className={`${styles.statusMessage} ${styles.error}`}>
                        <AlertTriangle size={20} />
                        <span>Ошибка: {apiError}</span>
                    </div>
                )}

                {/* Кнопка сохранения */}
                <button 
                    type="submit" 
                    className={styles.saveButton} 
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <><Loader size={20} className={styles.spinner} /><span>Сохранение...</span></>
                    ) : (
                        <><Save size={20} /><span>Сохранить изменения</span></>
                    )}
                </button>
            </form>
        </WorkspaceCard>
    );
};