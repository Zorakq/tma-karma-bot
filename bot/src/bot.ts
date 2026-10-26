// Логика бота, вынесенная из index.ts, чтобы её можно было запускать
// как отдельно (локально), так и в одном процессе с сервером (на Render).
import { Bot } from 'grammy';
import { trackMessage } from './analytics';
import { registerCommands } from './handlers';

// Создаёт бота, регистрирует хэндлеры и запускает long polling (не блокируя процесс).
export function startBot(): Bot {
  const bot = new Bot(process.env.BOT_TOKEN ?? '');

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

  // Запускаем long polling (промис завершится только при остановке бота)
  bot
    .start({
      onStart: (info) => {
        console.log(`[bot] Запущен как @${info.username} (id: ${info.id})`);
      },
    })
    .catch((err) => {
      console.error('[bot] Не удалось запустить long polling:', err);
    });

  return bot;
}
