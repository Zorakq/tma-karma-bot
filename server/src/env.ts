// Загружает переменные окружения из корневого файла .env монорепозитория.
// Пробуем несколько относительных путей, потому что процесс может быть запущен
// как из корня, так и из директории пакета (npm run dev -w server).
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

for (const candidate of ['.env', '../.env', '../../.env']) {
  loadEnv({ path: resolve(process.cwd(), candidate) });
}
