/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from '../styles/SideMenu.module.css';

interface SideMenuItemProps {
    icon: React.ReactNode;
    label: string;
    path: string;
    params?: Record<string, any>;
}

export const SideMenuItem: React.FC<SideMenuItemProps> = ({ icon, label, path, params = {} }) => {
    
    const location = useLocation();

    const isActive = location.pathname === path;

    return (
        <Link 
            to={path} 
            state={{ menuParams: params }} // Параметры через state роутера
            className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
        >
            {icon}
            <span className={styles.itemLabel}>{label}</span>
        </Link>
    );
};