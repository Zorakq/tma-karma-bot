// Точка входа Telegram-бота (отдельный процесс — для локальной разработки).
import './env';
import { config } from './config';
import { startBot } from './bot';

if (!config.botToken) {
  console.error('[bot] Не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен.');
  process.exit(1);
}

startBot();
