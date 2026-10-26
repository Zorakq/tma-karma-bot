// Корневой компонент Mini App: вкладки «Рейтинг» и «Профиль».
import { useEffect, useMemo, useState } from 'react';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { getCurrentUser, notifyReady } from './lib/telegram';
import type { TgUser } from './lib/telegram';
import { LeaderboardTab } from './components/LeaderboardTab';
import { ProfileTab } from './components/ProfileTab';

type Tab = 'top' | 'profile';

export default function App() {
  // Реактивно читаем пользователя из SDK (с fallback на window.Telegram)
  const sdkUser = useSignal(initData.user);
  const user: TgUser | undefined = (sdkUser as TgUser | undefined) ?? getCurrentUser();

  // Параметры запуска: ?chat_id=...&view=profile
  const chatId = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('chat_id');
    return raw && raw.length > 0 ? raw : null;
  }, []);

  const [tab, setTab] = useState<Tab>(() => {
    const view = new URLSearchParams(window.location.search).get('view');
    return view === 'profile' ? 'profile' : 'top';
  });

  useEffect(() => {
    notifyReady();
  }, []);

  // Вне Telegram показываем заглушку с инструкцией
  if (!user) {
    return <Placeholder emoji="🤖" title="Откройте приложение в Telegram" text="Это Telegram Mini App. Запустите бота в чате и нажмите кнопку /top или /profile." />;
  }

  // Без chat_id (открыто не через команду в чате)
  if (!chatId) {
    return <Placeholder emoji="💬" title="Чат не указан" text="Откройте Mini App через команду /top или /profile внутри чата." />;
  }

  const myUserId = String(user.id);

  return (
    <div className="flex h-full flex-col bg-tg-bg text-tg-text">
      <main className="flex-1 overflow-y-auto pb-16">
        {tab === 'top' ? (
          <LeaderboardTab chatId={chatId} myUserId={myUserId} />
        ) : (
          <ProfileTab chatId={chatId} userId={myUserId} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-black/5 bg-tg-bg dark:border-white/10">
        <TabButton active={tab === 'top'} onClick={() => setTab('top')} icon="🏆" label="Рейтинг" />
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon="👤" label="Профиль" />
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
        active ? 'text-tg-link' : 'text-tg-hint'
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Placeholder({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-tg-bg p-6 text-center text-tg-text">
      <div className="text-4xl">{emoji}</div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-tg-hint">{text}</p>
    </div>
  );
}
