// Команды бота: /start, /top и /profile — открывают Mini App с нужными параметрами.
import { Bot, InlineKeyboard } from 'grammy';
import { config } from './config';

export function registerCommands(bot: Bot): void {
  // /start — приветствие и краткая справка
  bot.command('start', async (ctx) => {
    const chatType = ctx.chat?.type;
    const isGroup = chatType === 'group' || chatType === 'supergroup';

    const text = isGroup
      ? 'Привет! Я веду статистику участников и рейтинг кармы в этом чате.\n\n' +
        '• /top — рейтинг участников\n' +
        '• /profile — мой профиль'
      : 'Привет! Добавьте меня в супергруппу, чтобы я начал собирать статистику и карму участников.';

    await ctx.reply(text);
  });

  // /top — кнопка открытия рейтинга Mini App для текущего чата
  bot.command('top', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const url = `${config.webappUrl}?chat_id=${chatId}`;
    const keyboard = new InlineKeyboard().webApp('🏆 Открыть рейтинг', url);

    await ctx.reply('Рейтинг участников чата:', { reply_markup: keyboard });
  });

  // /profile — кнопка перехода сразу в личный профиль внутри Mini App
  bot.command('profile', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const url = `${config.webappUrl}?chat_id=${chatId}&view=profile`;
    const keyboard = new InlineKeyboard().webApp('👤 Мой профиль', url);

    await ctx.reply('Ваш профиль в этом чате:', { reply_markup: keyboard });
  });
}
