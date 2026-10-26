// Модальное окно редактирования профиля: bio, соцсети и акцентный цвет.
import { useState } from 'react';
import { api } from '../lib/api';
import type { ProfileUser, SocialLink } from '../types';

const THEME_PRESETS = [
  '#2481cc', '#e91e63', '#9c27b0', '#4caf50',
  '#ff9800', '#f44336', '#00bcd4', '#795548',
];

interface Props {
  user: ProfileUser;
  onClose: () => void;
  onSaved: (data: { user: ProfileUser }) => void;
}

export function EditProfileModal({ user, onClose, onSaved }: Props) {
  const [bio, setBio] = useState(user.bio ?? '');
  const [links, setLinks] = useState<SocialLink[]>(user.socialLinks ?? [{ label: '', url: '' }]);
  const [theme, setTheme] = useState<string>(user.customTheme ?? THEME_PRESETS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const addLink = () => setLinks((prev) => [...prev, { label: '', url: '' }]);
  const removeLink = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    setError(null);

    const filtered = links
      .filter((l) => l.url.trim().length > 0)
      .map((l) => ({ label: l.label.trim() || l.url.trim(), url: l.url.trim() }));

    try {
      const res = await api.updateProfile({
        bio: bio.trim(),
        socialLinks: filtered.length > 0 ? filtered : null,
        customTheme: theme,
      });
      onSaved(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-tg-bg p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Редактировать профиль</h2>
          <button onClick={onClose} className="text-2xl leading-none text-tg-hint">
            ×
          </button>
        </div>

        {/* Биография */}
        <label className="mb-1 block text-sm text-tg-hint">О себе</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Расскажите о себе…"
          className="mb-4 w-full rounded-xl bg-tg-secondary-bg p-3 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
        />

        {/* Соцсети */}
        <label className="mb-1 block text-sm text-tg-hint">Соцсети</label>
        <div className="mb-2 flex flex-col gap-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={link.label}
                onChange={(e) => updateLink(i, 'label', e.target.value)}
                placeholder="Название"
                className="w-1/3 rounded-xl bg-tg-secondary-bg p-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
              />
              <input
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-xl bg-tg-secondary-bg p-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
              />
              <button
                onClick={() => removeLink(i)}
                className="rounded-xl bg-tg-secondary-bg px-2 text-tg-hint"
                aria-label="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button onClick={addLink} className="mb-4 text-sm font-medium text-tg-link">
          + Добавить ссылку
        </button>

        {/* Акцентный цвет */}
        <label className="mb-1 block text-sm text-tg-hint">Акцентный цвет</label>
        <div className="mb-4 flex gap-2">
          {THEME_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => setTheme(color)}
              className="h-8 w-8 rounded-full"
              style={{
                backgroundColor: color,
                outline: theme === color ? `3px solid ${color}` : 'none',
                outlineOffset: 2,
              }}
              aria-label={color}
            />
          ))}
        </div>

        {error && <p className="mb-2 text-sm text-tg-destructive">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-tg-button py-3 font-medium text-tg-button-text disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
