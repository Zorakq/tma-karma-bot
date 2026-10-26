// Аватар пользователя: фото либо цветной кружок с первой буквой.
import { useMemo } from 'react';

// Детерминированный цвет по ID пользователя.
function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = [
    '#2481cc', '#e91e63', '#9c27b0', '#4caf50',
    '#ff9800', '#00bcd4', '#795548', '#607d8b',
  ];
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({
  url,
  name,
  id,
  size = 44,
}: {
  url: string | null;
  name: string;
  id: string;
  size?: number;
}) {
  const fallbackColor = useMemo(() => colorFromId(id), [id]);
  const initial = (name.trim()[0] ?? '?').toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: fallbackColor, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
