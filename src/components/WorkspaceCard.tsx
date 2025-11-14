import React from 'react';
import { useTheme } from '../hooks/useTheme';
import styles from '../styles/App.module.css'; // Импорт стилей

// Общая обертка для рабочих пространств
export const WorkspaceCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    
    return (
        <div>
            <h2>{title}</h2>
            <div >{children}</div>
        </div>
    );
};