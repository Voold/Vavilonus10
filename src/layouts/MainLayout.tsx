import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SideMenu } from '../components/SideMenu';
import styles from '../styles/MainLayout.module.css';

export const MainLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className={styles.wrap}>
      {isMenuOpen && <div className={styles.overlay} onClick={closeMenu} />}

      <aside className={isMenuOpen ? styles.open : ''}>
        <div 
          className={styles.menuHandle} 
          onClick={toggleMenu}
        >
          <button className={styles.toggleButton} onClick={toggleMenu}>
            {isMenuOpen ? 'X' : '☰'}
          </button>
        </div>
        <SideMenu />
      </aside>
      
      <main>
        <Outlet />
      </main>
    </div>
  );
};