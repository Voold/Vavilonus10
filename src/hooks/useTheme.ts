import { useState, useEffect } from 'react';
import styles from '../styles/App.module.css'; // Import CSS Module

type Theme = 'light' | 'dark';

/**
 * Хук для управления светлой и темной темой.
 * Применяет класс 'dark' к элементу <html> и сохраняет выбор в localStorage.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Читаем тему из localStorage или устанавливаем 'light' по умолчанию
    const storedTheme = localStorage.getItem('theme');
    return (storedTheme === 'dark' ? 'dark' : 'light');
  });

  useEffect(() => {
    const html = document.documentElement;
    // Применяем глобальный класс 'dark'
    if (theme === 'dark') {
      html.classList.add(styles.dark);
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove(styles.dark);
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
};