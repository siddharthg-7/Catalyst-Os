/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './backend/routes/api';
import voiceRouter from './backend/voice/routes';
import { validateEnvironmentConfig } from './backend/services/configValidator';

import { createProxyMiddleware } from 'http-proxy-middleware';

// Validate secrets on boot
validateEnvironmentConfig();

import { prisma } from './backend/services/dbService';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Pre-warm Neon PostgreSQL connection pool to eliminate signup/signin latency
prisma.$connect()
  .then(() => console.log('⚡ Neon PostgreSQL connection pool pre-warmed and ready.'))
  .catch((err) => console.warn('⚠️ Neon PostgreSQL pre-connect warning:', err.message));

// Proxy /api/audio and /api/v1 to FastAPI before parsing it or passing to local apiRouter
app.use((req, res, next) => {
  if (req.path.startsWith('/api/audio') || req.path.startsWith('/api/v1')) {
    return createProxyMiddleware({
      target: process.env.FASTAPI_URL || 'http://127.0.0.1:8000',
      changeOrigin: true
    })(req, res, next);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Section 37: Liveness and Readiness Probes
app.get('/health', (req, res) => {
  res.json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    nodeVersion: process.version
  });
});

app.get('/ready', async (req, res) => {
  const { isDbAvailable } = await import('./backend/state');
  const { getRateLimiterMode } = await import('./backend/services/rateLimiter');
  const isReady = process.env.NODE_ENV === 'production' ? isDbAvailable : true;
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'degraded',
    databaseConnected: isDbAvailable,
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    rateLimiterMode: getRateLimiterMode(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount modularized Voice Studio & Speech API routes
app.use('/api/voice', voiceRouter);

// Mount modularized backend API routes
app.use('/api', apiRouter);

// ==================================================
// VITE AND STATIC ASSETS SERVING SETUP
// ==================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CatalystOS Full-Stack Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
