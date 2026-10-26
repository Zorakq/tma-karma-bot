// Валидация Telegram.WebApp.initData через HMAC-SHA256.
// Алгоритм: secret_key = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN),
// затем hash = HMAC_SHA256(key=secret_key, msg=data_check_string).
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { prisma } from './db';

// Авторизованный пользователь Telegram, прикрепляемый к запросу после валидации.
export interface TelegramUser {
  id: bigint;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
}

interface InitDataUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

// Безопасное сравнение строк в константное время.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Проверяет подпись initData и возвращает объект пользователя, либо null при невалидных данных.
export function validateInitData(initData: string): InitDataUser | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    // data_check_string: отсортированные по ключу пары "key=value", разделённые \n
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(config.botToken).digest();
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (!safeEqual(calculatedHash, hash)) return null;

    // Опциональная проверка свежести auth_date
    const authDate = Number(params.get('auth_date'));
    const maxAge = Number(process.env.INIT_DATA_MAX_AGE_SECONDS ?? 86400);
    if (maxAge > 0 && Number.isFinite(authDate) && Math.abs(Date.now() / 1000 - authDate) > maxAge) {
      return null;
    }

    const userRaw = params.get('user');
    if (!userRaw) return null;
    return JSON.parse(userRaw) as InitDataUser;
  } catch {
    return null;
  }
}

// Актуализирует метаданные пользователя из initData (username, имя, фото).
async function syncUser(user: InitDataUser): Promise<void> {
  const id = BigInt(user.id);
  await prisma.user.upsert({
    where: { id },
    update: {
      username: user.username ?? null,
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? null,
      photoUrl: user.photo_url ?? null,
    },
    create: {
      id,
      username: user.username ?? null,
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? null,
      photoUrl: user.photo_url ?? null,
    },
  });
}

// Middleware: извлекает и проверяет initData, блокирует неавторизованные запросы (401).
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers['x-telegram-init-data'];
  const initData =
    (typeof header === 'string' && header.length > 0 ? header : undefined) ||
    (req.headers.authorization?.startsWith('tma ')
      ? req.headers.authorization.slice(4)
      : undefined) ||
    (typeof req.query.initData === 'string' ? req.query.initData : undefined);

  const parsed = initData ? validateInitData(initData) : null;
  if (!parsed) {
    res.status(401).json({ error: 'Unauthorized: недействительный initData' });
    return;
  }

  const telegramUser: TelegramUser = {
    id: BigInt(parsed.id),
    username: parsed.username,
    firstName: parsed.first_name ?? '',
    lastName: parsed.last_name,
    photoUrl: parsed.photo_url,
  };

  // Поддерживаем метаданные в актуальном состоянии при каждом обращении к API
  await syncUser(parsed);

  (req as Request & { telegramUser?: TelegramUser }).telegramUser = telegramUser;
  next();
}
