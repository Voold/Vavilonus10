import React from 'react';
import { Outlet } from 'react-router-dom';
import { SideMenu } from '../components/SideMenu';
import styles from '../styles/MainLayout.module.css';

export const MainLayout: React.FC = () => {
  return (
    <div className={styles.wrap}>
        <aside>
          <SideMenu />
        </aside>
        <main>
          <Outlet />
        </main>
    </div>
  );
};