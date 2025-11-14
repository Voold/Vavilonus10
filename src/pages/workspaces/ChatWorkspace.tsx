import React from 'react';
import { MessageSquare } from 'lucide-react';
import { WorkspaceCard } from '../../components/WorkspaceCard';

export const ChatWorkspace: React.FC = () => (
  <WorkspaceCard title="Рабочее Пространство: Чат">
    <p>Здесь будет реализован интерфейс чата (WebSocket, виртуализация сообщений).</p>
    <p >
      <MessageSquare  />
      *Подсказка: Для чата потребуется двунаправленная связь (например, WebSocket) и оптимизация отрисовки списка сообщений (виртуализация).*
    </p>
  </WorkspaceCard>
);