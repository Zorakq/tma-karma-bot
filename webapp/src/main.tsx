import React from 'react';
import ReactDOM from 'react-dom/client';
import { init } from '@telegram-apps/sdk-react';
import App from './App';
import './index.css';

// Инициализируем Telegram Mini App SDK (обрабатывает события из нативного приложения).
// Вне Telegram вызов безопасен: SDK просто не обнаружит launch parameters.
try {
  init();
} catch (error) {
  console.warn('[webapp] Не удалось инициализировать Telegram SDK:', error);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
