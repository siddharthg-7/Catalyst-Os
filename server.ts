/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRouter from './backend/routes/api';

import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Proxy /api/audio to FastAPI before parsing it or passing to local apiRouter
app.use((req, res, next) => {
  if (req.path.startsWith('/api/audio')) {
    return createProxyMiddleware({
      target: process.env.FASTAPI_URL || 'http://127.0.0.1:8000',
      changeOrigin: true
    })(req, res, next);
  }
  next();
});

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
