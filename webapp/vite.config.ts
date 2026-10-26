import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Конфигурация Vite: в режиме разработки проксируем /api на локальный REST-сервер.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
