// Обёртка над fetch для обращения к REST API Mini App.
// К каждому запросу добавляется заголовок x-telegram-init-data для авторизации.
import { getRawInitData } from './telegram';
import type {
  LeaderboardResponse,
  ProfileResponse,
  ProfileUser,
  SocialLink,
  VoteResponse,
} from '../types';

const API_BASE = '/api';

// Ошибка API с кодом статуса и опциональным временем до следующей попытки (для кулдауна).
export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getRawInitData();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': initData,
      ...(options.headers ?? {}),
    },
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Тело не JSON — игнорируем
  }

  if (!response.ok) {
    const err = (body ?? {}) as { error?: string; retryAfterSeconds?: number };
    throw new ApiError(
      response.status,
      err.error ?? `Ошибка запроса (${response.status})`,
      err.retryAfterSeconds,
    );
  }

  return body as T;
}

export const api = {
  getLeaderboard: (chatId: string, sort: 'karma' | 'messages' = 'karma') =>
    request<LeaderboardResponse>(`/leaderboard?chat_id=${encodeURIComponent(chatId)}&sort=${sort}`),

  getProfile: (userId: string, chatId: string) =>
    request<ProfileResponse>(`/profile/${encodeURIComponent(userId)}?chat_id=${encodeURIComponent(chatId)}`),

  updateProfile: (payload: { bio?: string; socialLinks?: SocialLink[] | null; customTheme?: string }) =>
    request<{ user: ProfileUser }>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  vote: (chatId: string, targetId: string, type: 1 | -1) =>
    request<VoteResponse>('/vote', {
      method: 'POST',
      body: JSON.stringify({ chatId, targetId, type }),
    }),
};
