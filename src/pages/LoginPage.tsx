import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import styles from '../styles/App.module.css'; // Импорт стилей

export const LoginPage: React.FC = () => (
  <div>
    <div>
      <LogIn/>
      <h2>Вход через OAuth</h2>
      <p>
        Пожалуйста, авторизуйтесь для доступа к рабочему пространству.
      </p>
      <Link 
        to="/oauth-callback" 
      >
        Начать Авторизацию
      </Link>
    </div>
  </div>
);