// Вкладка «Рейтинг»: карточки участников с кармой, сообщениями и кнопками голосования.
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { haptic } from '../lib/telegram';
import type { LeaderboardItem } from '../types';
import { Avatar } from './Avatar';

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

// Отображаемое имя участника
function displayName(item: LeaderboardItem): string {
  if (item.username) return `@${item.username}`;
  const full = `${item.firstName} ${item.lastName ?? ''}`.trim();
  return full || `id${item.userId}`;
}

// Человекочитаемое время до окончания кулдауна
function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
  if (hours > 0) return `${hours}ч ${minutes}м ${seconds}с`;
  if (minutes > 0) return `${minutes}м ${seconds}с`;
  return `${seconds}с`;
}

interface CooldownMap {
  [key: string]: number; // ключ `${chatId}:${targetId}` -> момент окончания кулдауна (ms)
}

const STORAGE_KEY = 'tma_karma_cooldowns';

function loadCooldowns(): CooldownMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CooldownMap) : {};
  } catch {
    return {};
  }
}

export function LeaderboardTab({ chatId, myUserId }: { chatId: string; myUserId: string }) {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [sort, setSort] = useState<'karma' | 'messages'>('karma');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<CooldownMap>(() => loadCooldowns());
  const [now, setNow] = useState(() => Date.now());

  // Тик раз в секунду для визуального таймера кулдауна
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Персистим кулдауны в localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cooldowns));
  }, [cooldowns]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLeaderboard(chatId, sort);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить рейтинг');
    } finally {
      setLoading(false);
    }
  }, [chatId, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const remainingFor = useCallback(
    (targetId: string): number => {
      const until = cooldowns[`${chatId}:${targetId}`];
      return until ? Math.max(0, until - now) : 0;
    },
    [chatId, cooldowns, now],
  );

  const handleVote = useCallback(
    async (targetId: string, type: 1 | -1) => {
      const key = `${chatId}:${targetId}`;
      try {
        const res = await api.vote(chatId, targetId, type);
        setItems((prev) =>
          prev.map((it) => (it.userId === targetId ? { ...it, karma: res.karma } : it)),
        );
        setCooldowns((prev) => ({ ...prev, [key]: Date.now() + COOLDOWN_MS }));
        haptic('medium');
      } catch (e) {
        if (e instanceof ApiError && e.status === 429) {
          const retrySeconds = e.retryAfterSeconds ?? COOLDOWN_MS / 1000;
          setCooldowns((prev) => ({ ...prev, [key]: Date.now() + retrySeconds * 1000 }));
        } else {
          setError(e instanceof Error ? e.message : 'Ошибка голосования');
        }
      }
    },
    [chatId],
  );

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Переключатель сортировки */}
      <div className="flex gap-2">
        <SortButton active={sort === 'karma'} onClick={() => setSort('karma')}>
          По карме
        </SortButton>
        <SortButton active={sort === 'messages'} onClick={() => setSort('messages')}>
          По сообщениям
        </SortButton>
      </div>

      {loading && <p className="py-8 text-center text-tg-hint">Загрузка…</p>}
      {error && <p className="py-4 text-center text-sm text-tg-destructive">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="py-8 text-center text-tg-hint">Пока нет данных. Напишите что-нибудь в чат!</p>
      )}

      {items.map((item) => {
        const remaining = remainingFor(item.userId);
        const isSelf = item.userId === myUserId;

        return (
          <div key={item.userId} className="flex items-center gap-3 rounded-2xl bg-tg-secondary-bg p-3">
            <div className="w-8 text-center text-sm font-bold text-tg-hint">
              {item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : item.rank}
            </div>

            <Avatar url={item.avatar} name={displayName(item)} id={item.userId} size={44} />

            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {displayName(item)}
                {isSelf && <span className="ml-1 text-xs text-tg-hint">(вы)</span>}
              </div>
              <div className="text-xs text-tg-hint">
                ❤️ {item.karma} · 💬 {item.messageCount}
              </div>
            </div>

            {!isSelf && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1.5">
                  <VoteBtn label="−" disabled={remaining > 0} onClick={() => handleVote(item.userId, -1)} tone="down" />
                  <VoteBtn label="+" disabled={remaining > 0} onClick={() => handleVote(item.userId, 1)} tone="up" />
                </div>
                {remaining > 0 && (
                  <span className="text-[10px] text-tg-hint">⏳ {formatRemaining(remaining)}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint'
      }`}
    >
      {children}
    </button>
  );
}

function VoteBtn({
  label,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone: 'up' | 'down';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold text-white transition-opacity disabled:opacity-40 ${
        tone === 'up' ? 'bg-emerald-500' : 'bg-rose-500'
      }`}
    >
      {label}
    </button>
  );
}
