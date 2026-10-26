// Вкладка «Профиль»: статистика пользователя в текущем чате + кнопка редактирования.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ProfileResponse } from '../types';
import { Avatar } from './Avatar';
import { EditProfileModal } from './EditProfileModal';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ProfileTab({ chatId, userId }: { chatId: string; userId: string }) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getProfile(userId, chatId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  }, [userId, chatId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="py-8 text-center text-tg-hint">Загрузка…</p>;
  }
  if (error || !data) {
    return <p className="py-8 text-center text-sm text-tg-destructive">{error ?? 'Профиль не найден'}</p>;
  }

  const { user, stats } = data;
  const accent = user.customTheme ?? 'var(--tg-theme-link-color, #2481cc)';
  const displayName = user.username
    ? `@${user.username}`
    : `${user.firstName} ${user.lastName ?? ''}`.trim();

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Шапка профиля с акцентным цветом */}
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-tg-secondary-bg p-5">
        <div className="rounded-full p-0.5" style={{ boxShadow: `0 0 0 3px ${accent}` }}>
          <Avatar url={user.photoUrl} name={displayName} id={user.id} size={80} />
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold">{displayName}</div>
          {user.username && <div className="text-sm text-tg-hint">@{user.username}</div>}
        </div>

        {user.bio && <p className="text-center text-sm text-tg-hint">{user.bio}</p>}

        {user.socialLinks && user.socialLinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {user.socialLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-tg-bg px-3 py-1 text-xs font-medium"
                style={{ color: accent }}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        <button
          onClick={() => setEditing(true)}
          className="mt-1 rounded-xl bg-tg-button px-4 py-2 text-sm font-medium text-tg-button-text"
        >
          ✏️ Редактировать
        </button>
      </div>

      {/* Статистика */}
      <div className="rounded-2xl bg-tg-secondary-bg p-4">
        <h2 className="mb-3 text-sm font-semibold text-tg-hint">Статистика в этом чате</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Карма" value={stats ? String(stats.karma) : '—'} />
          <StatCard label="Сообщений" value={stats ? String(stats.messageCount) : '—'} />
          <StatCard label="Место в топе" value={stats?.rank ? `#${stats.rank}` : '—'} />
          <StatCard label="Первый заход" value={formatDate(stats?.firstSeenAt)} small />
        </div>
      </div>

      {editing && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setData((prev) => (prev ? { ...prev, user: updated.user } : prev));
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-tg-bg p-3">
      <div className={`${small ? 'text-sm' : 'text-lg'} font-semibold`}>{value}</div>
      <div className="text-xs text-tg-hint">{label}</div>
    </div>
  );
}
