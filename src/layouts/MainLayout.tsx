import React from 'react';
import { Outlet } from 'react-router-dom';
import { SideMenu } from '../components/SideMenu';
import styles from '../styles/MainLayput.module.css'; // Импорт стилей

/**
 * Основной компонент-макет: 25% Меню (SideMenu) и 75% Рабочая область (<Outlet />)
 */
export const MainLayout: React.FC = () => {
  return (
    <div className={styles.wrap}>
        {/* Menu (25% width) */}
        <SideMenu />
        
        {/* Workspace (75% width) - Uses Outlet for dynamic content */}
        <main>
          <Outlet />
        </main>
    </div>
  );
};