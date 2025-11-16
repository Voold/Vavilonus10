/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useManagementStore } from '../../store/useManagementStore.ts';
import styles from '../../styles/ManagementWorkspace.module.css';
import type { CompanyCreateBody, CompanyUpdateBody, TaskCreateBody, TaskUpdateBody } from '../../api/managementAPI.ts';

const initialCompanyFormData: CompanyCreateBody = {
    company_name: '',
    director_id: 1, // По умолчанию текущий директор
    inn: 0,
    folder_path: '',
    emploees_inn: [],
};

const initialTaskFormData: TaskCreateBody & { inn_worker: number } = {
    task_name: '',
    inn_worker: 0,
    deadline: '',
    task_body: '',
    complete: false,
};

const ManagementWorkspace: React.FC = () => {
    const {
        companies,
        tasks,
        isLoading,
        error,
        isDirector,
        loadInitialData,
        clearError,
        handleCreateCompany,
        handleUpdateCompany,
        handleCreateTask,
        handleDeleteTask,
        handleUpdateTask,
    } = useManagementStore();

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const [compForm, setCompForm] = useState<CompanyCreateBody>(initialCompanyFormData);
    const [taskForm, setTaskForm] = useState<typeof initialTaskFormData>(initialTaskFormData);
    const [updateCompId, setUpdateCompId] = useState<number | null>(null);
    const [updateTaskId, setUpdateTaskId] = useState<number | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // --- Общая логика ---

    const handleAction = async (action: Promise<void>, successMsg: string) => {
        setActionMessage(null);
        clearError();
        try {
            await action;
            setActionMessage({ type: 'success', message: successMsg });
        } catch (e: any) {
            setActionMessage({ type: 'error', message: e.message || "Произошла неизвестная ошибка." });
        }
    };

    // --- Компании: Создание/Обновление ---

    const handleCompanyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCompForm(prev => ({
            ...prev,
            [name]: name === 'inn' || name === 'director_id' ? parseInt(value) || 0 : value,
            // emploees_inn - упрощенная обработка: ожидаем список ИНН через запятую
            emploees_inn: name === 'emploees_inn' ? value.split(',').map(n => parseInt(n.trim()) || 0).filter(n => n !== 0) : prev.emploees_inn,
        }));
    };

    const submitCompanyForm = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSend: CompanyCreateBody = {
            ...compForm,
            // Приводим ИНН в нужный формат (число), если ввели строкой
            inn: Number(compForm.inn),
            director_id: Number(compForm.director_id),
        };

        if (updateCompId !== null) {
            // Обновление (PUT)
            await handleAction(
                handleUpdateCompany(updateCompId, dataToSend as CompanyUpdateBody),
                `Компания ID ${updateCompId} успешно обновлена.`
            );
            setUpdateCompId(null);
        } else {
            // Создание (POST)
            await handleAction(
                handleCreateCompany(dataToSend),
                `Компания '${dataToSend.company_name}' успешно создана (201).`
            );
        }
        setCompForm(initialCompanyFormData);
    };

    const startUpdateCompany = (companyId: number) => {
        const company = companies.find(c => c.id === companyId);
        if (company) {
            setUpdateCompId(companyId);
            setCompForm({
                company_name: company.company_name,
                director_id: company.director_id,
                inn: company.inn,
                folder_path: company.folder_path,
                emploees_inn: company.emploees_inn,
            });
        }
    };

    // --- Задачи: Создание/Обновление/Удаление ---

    const handleTaskFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setTaskForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (name === 'inn_worker' ? parseInt(value) || 0 : value),
        }));
    };

    const submitTaskForm = async (e: React.FormEvent) => {
        e.preventDefault();

        const { inn_worker, ...taskBody } = taskForm;

        if (updateTaskId !== null) {
            // Обновление (PUT)
            const updateBody: TaskUpdateBody = {
                ...taskBody,
                inn_worker: Number(inn_worker)
            };
            await handleAction(
                handleUpdateTask(updateTaskId, updateBody),
                `Задача ID ${updateTaskId} успешно обновлена (200).`
            );
            setUpdateTaskId(null);
        } else {
            // Создание (POST)
            await handleAction(
                handleCreateTask(Number(inn_worker), taskBody),
                `Задача '${taskBody.task_name}' успешно создана (201).`
            );
        }
        setTaskForm(initialTaskFormData);
    };

    const startUpdateTask = (taskId: number) => {
        const task = tasks.find(t => t.task_id === taskId);
        if (task) {
            setUpdateTaskId(taskId);
            setTaskForm({
                task_name: task.task_name,
                inn_worker: task.inn_worker || 0, // inn_worker может быть undefined в API-типе, но в форме он нужен
                deadline: task.deadline,
                task_body: task.task_body,
                complete: task.complete,
            });
        }
    };

    const handleDelete = async (taskId: number) => {
        if (window.confirm(`Вы уверены, что хотите удалить задачу ID ${taskId}?`)) {
            await handleAction(
                handleDeleteTask(taskId),
                `Задача ID ${taskId} успешно удалена (200).`
            );
        }
    };

    // --- Рендер ---

    if (!isDirector) {
        return <div className={styles.workspaceContainer}><p className={styles.error}>Нет прав доступа. Только директор может управлять данными.</p></div>;
    }

    return (
        <div className={styles.workspaceContainer}>
            <h1 className={styles.title}>Административная панель</h1>

            {isLoading && <p className={styles.loading}>Загрузка данных...</p>}
            {actionMessage && (
                <div className={`${styles.message} ${actionMessage.type === 'success' ? styles.success : styles.error}`}>
                    {actionMessage.message}
                </div>
            )}
            {error && !actionMessage && (
                <div className={`${styles.message} ${styles.error}`}>
                    Глобальная ошибка: {error}
                </div>
            )}

            <hr />

            {/* Секция Управления Компаниями */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Управление Компаниями (POST/PUT) 🏢</h2>
                <form onSubmit={submitCompanyForm}>
                    <div className={styles.formGrid}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="company_name">Название компании</label>
                            <input
                                id="company_name"
                                name="company_name"
                                value={compForm.company_name}
                                onChange={handleCompanyFormChange}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="inn_comp">ИНН компании</label>
                            <input
                                id="inn_comp"
                                name="inn"
                                type="number"
                                value={compForm.inn || ''}
                                onChange={handleCompanyFormChange}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="director_id">ID Директора</label>
                            <input
                                id="director_id"
                                name="director_id"
                                type="number"
                                value={compForm.director_id || ''}
                                onChange={handleCompanyFormChange}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="folder_path">Путь к папке</label>
                            <input
                                id="folder_path"
                                name="folder_path"
                                value={compForm.folder_path}
                                onChange={handleCompanyFormChange}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="emploees_inn">ИНН сотрудников (через запятую)</label>
                            <input
                                id="emploees_inn"
                                name="emploees_inn"
                                value={compForm.emploees_inn.join(', ')}
                                onChange={handleCompanyFormChange}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className={`${styles.button} ${styles.primaryButton}`}
                        disabled={isLoading}
                    >
                        {updateCompId !== null ? `Обновить компанию ID ${updateCompId} (PUT)` : "Создать компанию (POST)"}
                    </button>
                    {updateCompId !== null && (
                        <button
                            type="button"
                            className={`${styles.button} ${styles.secondaryButton}`}
                            onClick={() => { setUpdateCompId(null); setCompForm(initialCompanyFormData); }}
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                    )}
                </form>

                <h3 className={styles.sectionTitle}>Список Компаний</h3>
                <ul className={styles.dataList}>
                    {companies.map(c => (
                        <li key={c.id} className={styles.dataItem}>
                            <p><strong>ID:</strong> {c.id}</p>
                            <p><strong>Название:</strong> {c.company_name}</p>
                            <p><strong>ИНН:</strong> {c.inn}</p>
                            <p><strong>Директор ID:</strong> {c.director_id}</p>
                            <p><strong>Сотрудники (ИНН):</strong> {c.emploees_inn.join(', ')}</p>
                            <button
                                className={`${styles.button} ${styles.secondaryButton}`}
                                onClick={() => startUpdateCompany(c.id)}
                                disabled={isLoading}
                            >
                                Редактировать (PUT)
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <hr />

            {/* Секция Управления Задачами */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Управление Задачами (POST/PUT/DELETE) 📝</h2>
                <form onSubmit={submitTaskForm}>
                    <div className={styles.formGrid}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="task_name">Название задачи</label>
                            <input
                                id="task_name"
                                name="task_name"
                                value={taskForm.task_name}
                                onChange={handleTaskFormChange}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="inn_worker">ИНН Исполнителя (Query/Body)</label>
                            <input
                                id="inn_worker"
                                name="inn_worker"
                                type="number"
                                value={taskForm.inn_worker || ''}
                                onChange={handleTaskFormChange}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="deadline">Крайний срок (YYYY-MM-DD)</label>
                            <input
                                id="deadline"
                                name="deadline"
                                type="date"
                                value={taskForm.deadline}
                                onChange={handleTaskFormChange}
                                required
                            />
                        </div>
                        {updateTaskId !== null && (
                            <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <input
                                    id="complete"
                                    name="complete"
                                    type="checkbox"
                                    checked={taskForm.complete}
                                    onChange={handleTaskFormChange}
                                    style={{ width: 'auto', marginRight: '10px' }}
                                />
                                <label htmlFor="complete" style={{ marginBottom: 0 }}>Задача выполнена (Complete)</label>
                            </div>
                        )}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="task_body">Подробное описание</label>
                        <textarea
                            id="task_body"
                            name="task_body"
                            value={taskForm.task_body}
                            onChange={handleTaskFormChange}
                            rows={3}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={`${styles.button} ${styles.primaryButton}`}
                        disabled={isLoading}
                    >
                        {updateTaskId !== null ? `Обновить задачу ID ${updateTaskId} (PUT)` : "Создать задачу (POST)"}
                    </button>
                    {updateTaskId !== null && (
                        <button
                            type="button"
                            className={`${styles.button} ${styles.secondaryButton}`}
                            onClick={() => { setUpdateTaskId(null); setTaskForm(initialTaskFormData); }}
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                    )}
                </form>

                <h3 className={styles.sectionTitle}>Список Задач</h3>
                <ul className={styles.dataList}>
                    {tasks.map(t => (
                        <li key={t.task_id} className={`${styles.dataItem} ${t.complete ? styles.taskCompleted : styles.taskPending}`}>
                            <p><strong>ID:</strong> {t.task_id}</p>
                            <p><strong>Название:</strong> {t.task_name}</p>
                            <p><strong>Исполнитель ИНН:</strong> {t.inn_worker}</p>
                            <p><strong>Срок:</strong> {t.deadline}</p>
                            <p><strong>Статус:</strong> {t.complete ? '✅ Выполнено' : '⏳ В работе'}</p>
                            <p><strong>Описание:</strong> {t.task_body}</p>
                            <button
                                className={`${styles.button} ${styles.secondaryButton}`}
                                onClick={() => startUpdateTask(t.task_id)}
                                disabled={isLoading}
                            >
                                Редактировать (PUT)
                            </button>
                            <button
                                className={`${styles.button} ${styles.dangerButton}`}
                                onClick={() => handleDelete(t.task_id)}
                                disabled={isLoading}
                            >
                                Удалить (DELETE)
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ManagementWorkspace;