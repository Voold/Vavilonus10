import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.ts';

// Компонент для проверки авторизации перед рендерингом дочернего элемента
export const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Если не авторизован, перенаправляем на страницу входа
    return <Navigate to="/login" replace />;
  }

  return element;
};