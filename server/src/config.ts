import { resolve } from 'node:path';

// Конфигурация REST API. Значения читаются из переменных окружения (см. .env.example).
export const config = {
  port: Number(process.env.PORT ?? 3000),
  botToken: (process.env.BOT_TOKEN ?? '').trim(),
  databaseUrl: process.env.DATABASE_URL ?? '',
  // Путь к собранному webapp для раздачи статики в продакшене
  webappDist: process.env.WEBAPP_DIST ?? resolve(process.cwd(), '../webapp/dist'),
};
