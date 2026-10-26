// Точка входа REST API.
import './env';
import { createApp } from './app';
import { config } from './config';

// Сериализация BigInt в JSON (Telegram ID могут превышать Number.MAX_SAFE_INTEGER).
// Дополнительная страховка — основные поля и так приводятся к строке в routes.ts.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

if (!config.botToken) {
  console.error('[server] Не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен.');
  process.exit(1);
}

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[server] REST API запущен на http://localhost:${config.port}`);
});
