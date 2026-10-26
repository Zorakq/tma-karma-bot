// REST API Mini App: рейтинг, профиль и голосование.
// Все маршруты подключаются после authMiddleware, поэтому req.telegramUser гарантированно задан.
import { Router } from 'express';
import { prisma } from './db';
import type { TelegramUser } from './auth';

interface AuthedRequest {
  telegramUser: TelegramUser;
}

// Кулдаун голосования — 7 дней.
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Безопасно парсит значение в BigInt (Telegram ID могут превышать Number.MAX_SAFE_INTEGER).
function parseBigInt(value: unknown): bigint | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    const n = BigInt(String(value));
    return n >= 0n ? n : null;
  } catch {
    return null;
  }
}

// Безопасно парсит JSON-строку.
function safeParseJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// Сериализация пользователя для ответа (BigInt -> строка, socialLinks -> объект).
function serializeUser(user: {
  id: bigint;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  bio: string | null;
  socialLinks: string | null;
  customTheme: string | null;
}) {
  return {
    id: user.id.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    bio: user.bio,
    socialLinks: safeParseJson(user.socialLinks),
    customTheme: user.customTheme,
  };
}

export const apiRouter = Router();

// GET /api/leaderboard?chat_id=...&sort=karma|messages
// Список участников чата с сортировкой по карме (по умолчанию) или по числу сообщений.
apiRouter.get('/leaderboard', async (req, res) => {
  const chatId = parseBigInt(req.query.chat_id);
  if (chatId === null) {
    res.status(400).json({ error: 'Параметр chat_id обязателен' });
    return;
  }
  const sort = req.query.sort === 'messages' ? 'messages' : 'karma';

  const stats = await prisma.chatMemberStats.findMany({
    where: { chatId },
    orderBy: sort === 'messages' ? { messageCount: 'desc' } : { karma: 'desc' },
  });

  // Ручной join с таблицей пользователей (связи намеренно не описаны в схеме,
  // чтобы голосование не зависело от наличия записи User/Chat у цели).
  const userIds = [...new Set(stats.map((s) => s.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap = new Map(users.map((u) => [u.id.toString(), u]));

  const items = stats.map((s, index) => {
    const user = userMap.get(s.userId.toString());
    return {
      rank: index + 1,
      userId: s.userId.toString(),
      username: user?.username ?? null,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? null,
      avatar: user?.photoUrl ?? null,
      karma: s.karma,
      messageCount: s.messageCount,
    };
  });

  res.json({ chatId: chatId.toString(), sort, total: items.length, items });
});

// GET /api/profile/:userId?chat_id=...
// Карточка профиля, статистика в текущем чате, bio, соцсети и тема оформления.
apiRouter.get('/profile/:userId', async (req, res) => {
  const userId = parseBigInt(req.params.userId);
  const chatId = parseBigInt(req.query.chat_id);

  if (userId === null) {
    res.status(400).json({ error: 'Некорректный userId' });
    return;
  }
  if (chatId === null) {
    res.status(400).json({ error: 'Параметр chat_id обязателен' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  const stats = await prisma.chatMemberStats.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });

  let rank: number | null = null;
  if (stats) {
    // Место в топе: число участников с большей кармой + 1
    const higher = await prisma.chatMemberStats.count({
      where: { chatId, karma: { gt: stats.karma } },
    });
    rank = higher + 1;
  }

  const authed = (req as unknown as AuthedRequest).telegramUser;

  res.json({
    user: serializeUser(user),
    stats: stats
      ? {
          chatId: stats.chatId.toString(),
          firstSeenAt: stats.firstSeenAt.toISOString(),
          messageCount: stats.messageCount,
          karma: stats.karma,
          rank,
        }
      : null,
    isSelf: userId === authed.id,
  });
});

// PATCH /api/profile
// Обновление собственных полей (bio, socialLinks, customTheme).
apiRouter.patch('/profile', async (req, res) => {
  const authed = (req as unknown as AuthedRequest).telegramUser;
  const body = (req.body ?? {}) as { bio?: unknown; socialLinks?: unknown; customTheme?: unknown };

  const data: { bio?: string; socialLinks?: string | null; customTheme?: string } = {};

  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string') {
      res.status(400).json({ error: 'bio должен быть строкой' });
      return;
    }
    data.bio = body.bio.slice(0, 2000);
  }

  if (body.socialLinks !== undefined) {
    if (body.socialLinks === null) {
      data.socialLinks = null;
    } else if (typeof body.socialLinks === 'string') {
      try {
        JSON.parse(body.socialLinks);
        data.socialLinks = body.socialLinks;
      } catch {
        res.status(400).json({ error: 'socialLinks должен быть валидным JSON' });
        return;
      }
    } else if (typeof body.socialLinks === 'object') {
      data.socialLinks = JSON.stringify(body.socialLinks);
    } else {
      res.status(400).json({ error: 'Некорректный формат socialLinks' });
      return;
    }
  }

  if (body.customTheme !== undefined) {
    if (typeof body.customTheme !== 'string') {
      res.status(400).json({ error: 'customTheme должен быть строкой' });
      return;
    }
    data.customTheme = body.customTheme.slice(0, 64);
  }

  const user = await prisma.user.update({ where: { id: authed.id }, data });
  res.json({ user: serializeUser(user) });
});

// POST /api/vote
// Тело запроса: { chatId, targetId, type: 1 | -1 }.
// Кулдаун 7 дней, запрет голосовать за себя, обновление кармы цели.
apiRouter.post('/vote', async (req, res) => {
  const authed = (req as unknown as AuthedRequest).telegramUser;
  const body = (req.body ?? {}) as { chatId?: unknown; targetId?: unknown; type?: unknown };

  const chatId = parseBigInt(body.chatId);
  const targetId = parseBigInt(body.targetId);
  const type = body.type;

  if (chatId === null || targetId === null) {
    res.status(400).json({ error: 'chatId и targetId обязательны' });
    return;
  }
  if (type !== 1 && type !== -1) {
    res.status(400).json({ error: 'type должен быть 1 или -1' });
    return;
  }
  if (targetId === authed.id) {
    res.status(400).json({ error: 'Нельзя голосовать за себя' });
    return;
  }

  // Проверка кулдауна: последний голос за этого участника в этом чате за 7 дней
  const since = new Date(Date.now() - COOLDOWN_MS);
  const recent = await prisma.vote.findFirst({
    where: {
      chatId,
      voterId: authed.id,
      targetId,
      createdAt: { gt: since },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recent) {
    const retryAt = recent.createdAt.getTime() + COOLDOWN_MS;
    const retryInSeconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryInSeconds));
    res.status(429).json({
      error: 'Повторно голосовать за этого участника можно раз в 7 дней',
      retryAfterSeconds: retryInSeconds,
      retryAt: new Date(retryAt).toISOString(),
    });
    return;
  }

  // Создаём голос и обновляем карму цели в одной транзакции
  const [, stats] = await prisma.$transaction([
    prisma.vote.create({
      data: { chatId, voterId: authed.id, targetId, voteType: type },
    }),
    prisma.chatMemberStats.upsert({
      where: { chatId_userId: { chatId, userId: targetId } },
      update: { karma: { increment: type } },
      create: { chatId, userId: targetId, karma: type, messageCount: 0, firstSeenAt: new Date() },
    }),
  ]);

  res.json({
    ok: true,
    chatId: chatId.toString(),
    targetId: targetId.toString(),
    voteType: type,
    karma: stats.karma,
  });
});
