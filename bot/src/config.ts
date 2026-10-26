// Конфигурация бота. Значения читаются из переменных окружения (см. .env.example).
export const config = {
  // trim() убирает случайные пробелы/переносы при копировании из .env
  botToken: (process.env.BOT_TOKEN ?? '').trim(),
  // Публичный HTTPS-адрес Mini App (без завершающего слэша).
  // На Render используется RENDER_EXTERNAL_URL (автоматический адрес web-сервиса).
  webappUrl: (process.env.WEBAPP_URL ?? process.env.RENDER_EXTERNAL_URL ?? '').trim().replace(/\/+$/, ''),
};
