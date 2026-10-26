# 🤖 Telegram-бот «Карма» со встроенным Mini App

Полнофункциональный Telegram-бот с Telegram Mini App (TMA): собирает статистику участников
чатов, ведёт рейтинг «кармы» и позволяет каждому участнику заполнять профиль.

- **Бот** (`grammy`, long polling) — считает сообщения, актуализирует профили, открывает Mini App.
- **REST API** (`Express`) — защищён валидацией `Telegram.WebApp.initData` (HMAC-SHA256).
- **Mini App** (`React 18 + Vite + Tailwind`) — рейтинг, профиль, голосование с кулдауном.
- **База данных** — SQLite + Prisma ORM (локальный запуск без внешних сервисов, легко перейти на PostgreSQL).

---

## 📁 Структура монорепозитория

```
tma-karma-bot/
├── bot/            # Хэндлеры и логика Telegram-бота (grammy)
│   └── src/
│       ├── index.ts       # Точка входа (long polling)
│       ├── handlers.ts    # Команды /start, /top, /profile
│       ├── analytics.ts   # Сбор статистики сообщений
│       ├── config.ts      # Конфигурация
│       ├── db.ts          # PrismaClient
│       └── env.ts         # Загрузка .env
├── server/         # REST API для Mini App (Express)
│   └── src/
│       ├── index.ts       # Точка входа
│       ├── app.ts         # Сборка Express-приложения
│       ├── auth.ts        # Валидация initData (HMAC-SHA256)
│       ├── routes.ts      # Endpoints: leaderboard, profile, vote
│       ├── config.ts      # Конфигурация
│       ├── db.ts          # PrismaClient
│       └── env.ts         # Загрузка .env
├── webapp/         # Клиент React (Telegram Mini App)
│   └── src/
│       ├── App.tsx        # Корневой компонент, вкладки
│       ├── main.tsx       # Вход, инициализация SDK
│       ├── lib/           # telegram.ts, api.ts
│       ├── types.ts       # Типы API
│       └── components/    # Leaderboard, Profile, Edit-модалка, Avatar
├── prisma/
│   └── schema.prisma      # Схема БД
├── .env.example           # Пример переменных окружения
├── package.json           # Корневые скрипты и workspace
└── README.md
```

---

## ✅ Требования

- **Node.js 20+**
- **npm** (или любой менеджер с поддержкой workspaces)
- Аккаунт Telegram и доступ к [@BotFather](https://t.me/BotFather)
- Для локальной разработки — HTTPS-туннель ([ngrok](https://ngrok.com/), [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/), [localtunnel](https://theboroer.github.io/localtunnel-www/) и т.п.)

> Telegram Mini App должен открываться по **HTTPS** (исключение — `localhost`, который Telegram
> позволяет в некоторых сценариях). Надёжнее всего поднять туннель.

---

## 🚀 Пошаговый запуск

### 1. Регистрация бота в BotFather

1. Откройте [@BotFather](https://t.me/BotFather) и отправьте `/newbot`.
2. Введите имя бота (например, `Карма чата`).
3. Введите username бота (например, `karma_chat_bot`).
4. Скопируйте выданный **токен** вида `123456789:AAExampleToken`.

### 2. Отключение Privacy Mode (обязательно для аналитики)

По умолчанию бот получает только команды и упоминания. Чтобы он **видел все сообщения**
в супергруппах (для подсчёта `messageCount` и `firstSeenAt`), отключите privacy mode:

1. В BotFather отправьте `/setprivacy`.
2. Выберите бота.
3. Нажмите **Disable**.

### 3. Привязка Mini App (кнопка)

Есть два способа открыть Mini App:

- **Через inline-кнопку** (уже реализовано): команды `/top` и `/profile` сами отправляют
  сообщение с кнопкой `WebAppInfo`. Для этого достаточно указать `WEBAPP_URL` в `.env`.
- **Через Menu Button (кнопку меню)**: в BotFather `/mybots` → ваш бот → **Bot Settings** →
  **Menu Button** → укажите URL вашего Mini App. Этот способ удобен для личных чатов с ботом.

### 4. Подготовка окружения

```bash
# Склонируйте/распакуйте проект и перейдите в него
cd tma-karma-bot

# Скопируйте пример конфигурации
cp .env.example .env
```

Отредактируйте `.env`:

```dotenv
BOT_TOKEN=123456789:AAExampleToken
WEBAPP_URL=https://your-tunnel.example.com
PORT=3000
DATABASE_URL=file:./dev.db
```

### 5. HTTPS-туннель (локальная разработка)

В режиме разработки Mini App собирается Vite на порту **5173**, а API работает на **3000**.
Vite проксирует `/api` на сервер, поэтому достаточно **одного** туннеля — на Vite:

```bash
# пример с ngrok (установите ngrok и авторизуйтесь)
ngrok http 5173
```

Полученный HTTPS-адрес (`https://xxxx.ngrok-free.app`) укажите в `WEBAPP_URL`.

### 6. Установка зависимостей и запуск

```bash
npm install        # установит зависимости и сгенерирует Prisma Client
npm run dev        # db:push + запуск bot, server и webapp
```

Что происходит при `npm run dev`:

1. `prisma db push` — создаёт/синхронизирует схему SQLite и генерирует клиент.
2. `bot` запускается на long polling (команды и сбор статистики).
3. `server` запускается на `http://localhost:3000`.
4. `webapp` (Vite) запускается на `http://localhost:5173`.

### 7. Проверка

1. Добавьте бота в супергруппу.
2. Убедитесь, что у бота выключен privacy mode (шаг 2).
3. Напишите несколько сообщений в группу.
4. Отправьте `/top` — появится кнопка «Открыть рейтинг». Нажмите её.
5. Mini App откроется, покажет рейтинг, позволит голосовать и редактировать профиль.

---

## 📦 Скрипты (корневой `package.json`)

| Команда            | Описание                                                        |
| ------------------ | --------------------------------------------------------------- |
| `npm run dev`      | Запуск всего проекта в режиме разработки (bot + server + webapp) |
| `npm run build`    | Сборка всех пакетов (webapp → bot → server)                     |
| `npm run start`    | Запуск собранных bot и server                                    |
| `npm run db:push`  | Синхронизация схемы Prisma с БД                                  |
| `npm run db:generate` | Генерация Prisma Client                                      |
| `npm run db:studio`   | Открыть Prisma Studio для просмотра данных                    |

---

## 🔐 Переменные окружения

| Переменная                  | Описание                                                                 | Пример                              |
| --------------------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| `BOT_TOKEN`                 | Токен бота от BotFather                                                   | `123456789:AAExampleToken`          |
| `WEBAPP_URL`                | Публичный HTTPS-адрес Mini App (без завершающего слэша)                  | `https://xxx.ngrok-free.app`        |
| `PORT`                      | Порт REST API сервера                                                     | `3000`                              |
| `DATABASE_URL`              | Строка подключения к БД                                                   | `file:./dev.db`                     |
| `INIT_DATA_MAX_AGE_SECONDS` | Максимальный возраст `initData` в секундах (0 — отключить проверку)      | `86400`                             |

> Для SQLite файл БД будет создан рядом со схемой: `prisma/dev.db`.
> Для перехода на PostgreSQL замените `DATABASE_URL` и в `prisma/schema.prisma`
> поменяйте `provider = "sqlite"` на `provider = "postgresql"`.

---

## 🔌 REST API

Все маршруты `/api/*` требуют заголовок `x-telegram-init-data` с валидной подписью
(иначе возвращается `401`).

| Метод  | Маршрут                          | Описание                                                        |
| ------ | -------------------------------- | --------------------------------------------------------------- |
| `GET`  | `/api/leaderboard?chat_id=...`   | Рейтинг участников чата (`sort=karma` или `sort=messages`)      |
| `GET`  | `/api/profile/:userId?chat_id=...` | Карточка профиля и статистика в чате                          |
| `PATCH`| `/api/profile`                   | Обновление `bio`, `socialLinks`, `customTheme`                  |
| `POST` | `/api/vote`                      | Голосование `{ chatId, targetId, type: 1 \| -1 }`               |
| `GET`  | `/health`                        | Health-check (без авторизации)                                  |

### Правила голосования

- Голосовать за себя **запрещено** → `400`.
- Кулдаун **7 дней** между голосами одного и того же участника за одного и того же человека
  в одном чате → при нарушении возвращается `429` с полями `retryAfterSeconds` и `retryAt`.

### Валидация initData

Используется стандартный алгоритм Telegram:

```
secret_key = HMAC_SHA256(key = "WebAppData", message = BOT_TOKEN)
hash       = HMAC_SHA256(key = secret_key, message = data_check_string)
```

где `data_check_string` — отсортированные по ключу пары `key=value` (без `hash`),
разделённые символом `\n`.

---

## 🧱 Схема базы данных

- **User** — `id` (BigInt), `username`, `firstName`, `lastName`, `photoUrl`, `bio`,
  `socialLinks` (JSON-строка), `customTheme`, `createdAt`.
- **Chat** — `id` (BigInt), `title`, `type`.
- **ChatMemberStats** — статистика участника в чате: `firstSeenAt`, `messageCount`, `karma`.
  Уникальный индекс `@@unique([chatId, userId])`.
- **Vote** — голоса: `chatId`, `voterId`, `targetId`, `voteType` (+1/−1), `createdAt`.
  Индекс `@@index([chatId, voterId, targetId, createdAt])`.

Данные изолированы по чатам: вся статистика и голоса привязаны к конкретному `chatId`.

---

## ☁️ Деплой на Render (постоянный адрес, без туннелей и VPN)

Самый простой способ получить рабочего бота с постоянным HTTPS-адресом. Проект уже
подготовлен: есть `render.yaml` (Blueprint) и PostgreSQL-схема (`prisma/schema.postgres.prisma`).

Архитектура на Render — **один web-сервис**, внутри которого крутятся и API/Mini App, и бот
(бесплатный тариф Render не поддерживает отдельные background worker, поэтому они объединены
в одном процессе — см. `server/src/render.ts`).

### Шаг 1 — бесплатная база данных Neon

1. Зарегистрируйтесь на [neon.tech](https://neon.tech) (через GitHub).
2. Создайте проект (бесплатный тариф, карта не нужна).
3. Скопируйте строку подключения вида `postgresql://...`.

### Шаг 2 — деплой через Blueprint

1. Загрузите проект в GitHub-репозиторий (любой, можно приватный).
2. В [Render](https://render.com) → **New → Blueprint** → подключите репозиторий.
3. Render прочитает `render.yaml` и создаст **один** сервис `karma-server`.
4. При деплое Render попросит ввести два значения:
   - `BOT_TOKEN` — токен бота;
   - `DATABASE_URL` — строка подключения из Neon (шаг 1).
5. Нажмите **Apply** и дождитесь статуса **Live**.

### Шаг 3 — проверка

1. Откройте `karma-server` → скопируйте его URL (`https://karma-server.onrender.com`).
2. В логах сервиса найдите строку `[bot] Запущен как @ваш_бот`.
3. Отправьте боту `/top` в Telegram.
   (`WEBAPP_URL` настраивать не нужно — бот берёт адрес сервиса из `RENDER_EXTERNAL_URL`.)

### Важные замечания

- **Privacy Mode** должен быть выключен в BotFather (`/setprivacy` → Disable).
- **Карта на Render** — нужна для верификации аккаунта (временное удержание ~$1, возвращается).
  Оставайтесь на плане **Free**.
- **База данных** — Neon бесплатна без карты. Для смены БД достаточно поменять `DATABASE_URL`.
- Бесплатные сервисы Render могут «засыпать» после простоя; бот на long polling сам
  поддерживает активность, а Mini App «проснётся» при первом открытии.

### Деплой на другой хостинг (VPS, Railway, Fly.io)

`npm run build` собирает всё, а `server` в продакшене сам раздаёт `webapp/dist` как статику.
Достаточно: собрать проект, указать `DATABASE_URL` (PostgreSQL) и `BOT_TOKEN`, затем запустить
`npm run start:render -w server` (один процесс: API + Mini App + бот).

---

## 🛠️ Устранение неполадок

- **Бот не считает сообщения** — проверьте, что Privacy Mode отключён (`/setprivacy` → Disable).
- **Mini App не открывается / «ссылка недоступна»** — URL должен быть HTTPS; проверьте `WEBAPP_URL`
  и что туннель ведёт на Vite (`5173`) в разработке.
- **Запросы возвращают 401** — `BOT_TOKEN` в `.env` должен совпадать с токеном, которым
  подписан `initData`; проверьте, что фронтенд передаёт актуальный `initData`.
- **«database is locked»** — редкая ситуация при одновременной записи из двух процессов в SQLite;
  для продакшена используйте PostgreSQL.

---

## 📄 Лицензия

MIT. Используйте свободно в своих проектах.
