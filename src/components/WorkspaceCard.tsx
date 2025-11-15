import React from 'react';
import styles from '../styles/WorkspaceCard.module.css';

interface WorkspaceCardProps {
  title: string;
  children: React.ReactNode;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ title, children }) => (
  <div className={styles.cardWrapper}>
    <h1 className={styles.cardTitle}>{title}</h1>
    <div className={styles.cardContent}>
      {children}
    </div>
  </div>
);