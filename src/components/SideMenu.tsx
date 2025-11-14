import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, MessageSquare, BarChart3, Settings } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.ts';
import styles from '../styles/SideMenu.module.css'; // Импорт стилей

/**
 * Левое Меню (25% ширины)
 */
export const SideMenu: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const navItems = [
    { to: "/chat", icon: MessageSquare, label: "Чат" },
    { to: "/data-viz", icon: BarChart3, label: "Визуализация Данных" },
    { to: "/settings", icon: Settings, label: "Настройки" },
  ];

  const asideClasses = `${styles.aside} ${isDark ? styles.asideDark : ''} transition-colors`;
  const logoClasses = `${styles.logo} ${isDark ? styles.logoDark : ''}`;
  const themeButtonClasses = `${styles.themeButton} ${isDark ? styles.themeButtonDark : styles.themeButtonLight}`;

  return (
    <aside className={styles.wrap}>
      <div>
        {/* Logo/Title Section */}
        <h1 className={logoClasses}>
          Vite SPA Dashboard
        </h1>

        {/* Navigation Links */}
        <nav className={styles.nav}>
          {navItems.map(item => {
            const navItemClasses = `${styles.navItem} ${isDark ? styles.navItemDark : ''}`;
            return (
              <Link 
                key={item.to} 
                to={item.to}
                className={navItemClasses}
              >
                <item.icon/>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer/Settings Section */}
      <div>
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon/>
          ) : (
            <Sun/>
          )}
          {theme === 'light' ? "Тёмная Тема" : "Светлая Тема"}
        </button>
      </div>
    </aside>
  );
};