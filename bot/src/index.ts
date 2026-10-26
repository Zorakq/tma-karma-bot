// Точка входа Telegram-бота (режим long polling).
import './env';
import { Bot } from 'grammy';
import { config } from './config';
import { trackMessage } from './analytics';
import { registerCommands } from './handlers';

if (!config.botToken) {
  console.error('[bot] Не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен.');
  process.exit(1);
}

const bot = new Bot(config.botToken);

// Логируем ошибки, чтобы бот не падал из-за отдельного сбойного апдейта
bot.catch((err) => {
  console.error('[bot] Ошибка при обработке апдейта:', err.error);
});

// Регистрируем команды (/start, /top, /profile)
registerCommands(bot);

// Учёт сообщений для аналитики
bot.on('message', async (ctx) => {
  await trackMessage(ctx);
});

bot.start({
  onStart: (info) => {
    console.log(`[bot] Запущен как @${info.username} (id: ${info.id})`);
  },
});
