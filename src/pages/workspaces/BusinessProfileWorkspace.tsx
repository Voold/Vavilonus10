import React, { useEffect } from 'react';
import { Save, Edit2 } from 'lucide-react';
import { WorkspaceCard } from '../../components/WorkspaceCard'; 
import { useBusinessProfileStore } from '../../store/useBusinessProfileStore'; // ⭐ Импорт нового хранилища
import styles from '../../styles/BusinessProfileWorkspace.module.css'; // ⭐ Импорт стилей

// Переименован для лучшего соответствия содержимому
export const BusinessProfileWorkspace: React.FC = () => {
    const { profile, isLoaded, setProfile, loadProfile } = useBusinessProfileStore();
    
    // Эффект для загрузки данных из localStorage при монтировании
    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleSave = () => {
        // Логика сохранения уже внутри setProfile, но добавим оповещение для пользователя
        setProfile(profile);
        alert('Описание бизнеса сохранено!');
    };
    
    // Если данные еще не загружены, показываем заглушку
    if (!isLoaded) {
        return (
            <WorkspaceCard title="Загрузка...">
                <div className={styles.loading}>Загрузка данных профиля...</div>
            </WorkspaceCard>
        );
    }

    return (
        <WorkspaceCard title="Главная">
            <div className={styles.container}>
                <h3 className={styles.title}>
                    <Edit2 size={20} className={styles.icon} /> 
                    Опишите ваш бизнес
                </h3>
                
                <p className={styles.description}>
                    Кратко опишите сферу деятельности вашей компании, ключевые продукты и целевую аудиторию. Эти данные будут использоваться AI для персонализации всех ответов и сценариев.
                </p>

                <textarea
                    className={styles.textarea}
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    placeholder="Например: 'Моя компания — это небольшой онлайн-магазин, который продает экологически чистые игрушки для детей 3-7 лет. Наша цель — осознанные родители.' "
                    rows={10}
                />

                <button 
                    className={styles.saveButton}
                    onClick={handleSave}
                    disabled={!profile.trim()}
                >
                    <Save size={18} />
                    Сохранить
                </button>
                
{/*                 {profile && (
                    <div className={styles.infoBox}>
                        Данные сохранены в локальном хранилище. Вы можете редактировать их в любое время.
                    </div>
                )} */}
            </div>
        </WorkspaceCard>
    );
};