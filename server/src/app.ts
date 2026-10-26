// Сборка Express-приложения: middleware, маршруты API и раздача собранного webapp.
import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from './config';
import { authMiddleware } from './auth';
import { apiRouter } from './routes';

export function createApp(): express.Express {
  const app = express();

  // CORS — на случай, если webapp и API разнесены по разным источникам в разработке
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-telegram-init-data, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  // Health-check без авторизации
  app.get('/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // Все маршруты Mini App проходят обязательную валидацию initData
  app.use('/api', authMiddleware, apiRouter);

  // JSON 404 для несуществующих маршрутов API
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Раздача собранного webapp (продакшен-режим)
  const dist = config.webappDist;
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(resolve(dist, 'index.html'));
      } else {
        next();
      }
    });
  }

  return app;
}
