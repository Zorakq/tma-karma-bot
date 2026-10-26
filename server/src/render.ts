// Комбинированная точка входа для Render: один процесс запускает и REST API, и бота.
// Бесплатный тариф Render не поддерживает background worker, поэтому бот живёт
// внутри web-сервиса вместе с API.
import './env';
import { createApp } from './app';
import { config } from './config';
import { startBot } from '@tma/bot';

// Сериализация BigInt в JSON (Telegram ID могут превышать Number.MAX_SAFE_INTEGER)
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

if (!config.botToken) {
  console.error('[server] Не задан BOT_TOKEN.');
  process.exit(1);
}

// REST API (раздаёт Mini App и отвечает на /api/*)
const app = createApp();
app.listen(config.port, '0.0.0.0', () => {
  console.log(`[server] REST API запущен на порту ${config.port}`);
});

// Telegram-бот (long polling) в этом же процессе
startBot();
