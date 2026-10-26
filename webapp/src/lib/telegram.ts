// Доступ к данным и API Telegram WebApp.
// Используем только глобальный объект window.Telegram.WebApp (внедряется клиентом Telegram).
// Это самый надёжный способ — он не зависит от версии и поведения SDK.

// Пользователь из initData (упрощённый тип).
export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

// Глобальный объект, внедряемый клиентом Telegram.
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: TgUser;
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        colorScheme: 'light' | 'dark';
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

// Сырая строка initData — отправляется на сервер для HMAC-валидации.
export function getRawInitData(): string {
  return window.Telegram?.WebApp?.initData ?? '';
}

// Текущий пользователь Telegram.
export function getCurrentUser(): TgUser | undefined {
  return window.Telegram?.WebApp?.initDataUnsafe?.user;
}

// Находимся ли мы внутри Telegram Mini App.
export function isInTelegram(): boolean {
  return Boolean(window.Telegram?.WebApp);
}

// Сигнализируем Telegram, что приложение готово, и подстраиваем цвет шапки под тему.
export function notifyReady(): void {
  try {
    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      webApp.ready();
      webApp.expand();
      webApp.setHeaderColor?.('bg_color');
    }
  } catch {
    // Не критично
  }
}

// Тактильный отклик (вибрация).
export function haptic(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'): void {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch {
    // Не критично
  }
}
