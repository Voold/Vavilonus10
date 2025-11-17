import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme.ts';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import  ChatWorkspace  from './pages/workspaces/ChatWorkspace';
/* import { DataVizWorkspace } from './pages/workspaces/DataVizWorkspace';
import { SettingsPage } from './pages/workspaces/SettingsPage'; */
import styles from './styles/App.module.css';
/* import { HomeWorkspace } from './pages/workspaces/HomeWorkspace.tsx'; */
/* import { MarketingWorkspace } from './pages/workspaces/MarketingWorkspace.tsx'; */
import { AuthPage } from './pages/AuthPage.tsx';
/* import { SettingsWorkspace } from './pages/workspaces/SettingsWorkspace.tsx'; */
import ChatWithActions from './pages/workspaces/ChatWithActionsWorkspace.tsx';
import ManagementWorkspace from './pages/workspaces/ManagementWorkspace.tsx';
import { BusinessProfileWorkspace } from './pages/workspaces/BusinessProfileWorkspace.tsx';
/* import SimpleChat from './pages/workspaces/SimpleChat.tsx'; */
/* import CompanyManager from './pages/workspaces/CompanyManager.tsx'; */

const App: React.FC = () => {
  // Инициализируем управление темой (применяет класс к <html>)
  useTheme();

  return (
    <div className={styles.app}>
      <BrowserRouter>
        <Routes>
          {/* Маршруты, не требующие авторизации */}
          <Route path="/auth" element={<AuthPage />} />
          {/* Placeholder for OAuth Callback - handles redirect logic */}
          <Route path="/oauth-callback" element={<Navigate to="/home" replace />} /> 

          {/* Защищенные маршруты, использующие MainLayout */}
          <Route 
            path="/" 
            element={<ProtectedRoute element={<MainLayout />} />}
          >
            {/* Default Route: Redirect to Chat */}
            <Route index element={<Navigate to="home" replace />} /> 

            {/* Рабочие Пространства (Вложенные маршруты) */}
            <Route path="home" element={<BusinessProfileWorkspace />} />
            <Route path="chat" element={<ChatWorkspace />} />
            <Route path="marketing" element={<ChatWithActions />} />
            <Route path="finance" element={<ChatWithActions />} />
            {/* <Route path="settings" element={<SettingsWorkspace />} /> */}
            <Route path="management" element={<ManagementWorkspace />} />
            {/* <Route path="ch" element={<SimpleChat/>} /> */}
            {/* <Route path="cc" element={<CompanyManager/>} /> */}
    {/*         <Route path="data-viz" element={<DataVizWorkspace />} />
            <Route path="settings" element={<SettingsPage />} /> */}

            {/* 404 Not Found (редирект на чат) */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;