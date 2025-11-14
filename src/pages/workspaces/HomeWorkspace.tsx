import React from 'react';
import { MessageSquare } from 'lucide-react';
import { WorkspaceCard } from '../../components/WorkspaceCard';

export const HomeWorkspace: React.FC = () => (
  <WorkspaceCard title="Рабочее Пространство: Чат">
    <p>Здесь будет реализован интерфейс домашней страницы</p>
    <p>
      <MessageSquare/>
    </p>
  </WorkspaceCard>
);