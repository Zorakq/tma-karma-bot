// Сбор аналитики: учёт сообщений, актуализация метаданных пользователей и чатов.
import type { Context } from 'grammy';
import { prisma } from './db';

// Определяет, является ли сообщение «содержательным» (текст, медиа, стикер и т.п.),
// а не служебным (вход/выход участника, смена названия и т.д.), не командой и не от бота.
function isCountableMessage(message: Context['message']): boolean {
  if (!message) return false;

  const from = message.from;
  if (!from || from.is_bot) return false;

  // Пропускаем команды (например, /top) — они не считаются обычным сообщением
  const hasCommand = message.entities?.some(
    (entity) => entity.type === 'bot_command' && entity.offset === 0,
  );
  if (hasCommand) return false;

  return Boolean(
    message.text ||
    message.caption ||
    message.sticker ||
    message.photo ||
    message.video ||
    message.animation ||
    message.audio ||
    message.document ||
    message.voice ||
    message.video_note ||
    message.location ||
    message.contact ||
    message.poll ||
    message.dice ||
    message.game ||
    message.venue,
  );
}

// Обрабатывает входящее сообщение в группе/супергруппе:
//  - обновляет метаданные пользователя и чата;
//  - фиксирует firstSeenAt при первом сообщении;
//  - инкрементирует messageCount для связки [chatId, userId].
export async function trackMessage(ctx: Context): Promise<void> {
  const message = ctx.message;
  const chat = message?.chat;
  const from = message?.from;

  if (!chat || !from) return;
  if (chat.type !== 'group' && chat.type !== 'supergroup') return;
  if (!isCountableMessage(message)) return;

  const userId = BigInt(from.id);
  const chatId = BigInt(chat.id);

  await prisma.$transaction([
    // Актуализация метаданных пользователя
    prisma.user.upsert({
      where: { id: userId },
      update: {
        username: from.username ?? null,
        firstName: from.first_name,
        lastName: from.last_name ?? null,
      },
      create: {
        id: userId,
        username: from.username ?? null,
        firstName: from.first_name,
        lastName: from.last_name ?? null,
        photoUrl: null,
      },
    }),
    // Актуализация данных чата
    prisma.chat.upsert({
      where: { id: chatId },
      update: { title: chat.title ?? null, type: chat.type },
      create: { id: chatId, title: chat.title ?? null, type: chat.type },
    }),
    // Инкремент счётчика сообщений; при первом сообщении фиксируется firstSeenAt
    prisma.chatMemberStats.upsert({
      where: { chatId_userId: { chatId, userId } },
      update: { messageCount: { increment: 1 } },
      create: { chatId, userId, messageCount: 1, firstSeenAt: new Date(), karma: 0 },
    }),
  ]);
}
