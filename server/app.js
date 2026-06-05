import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes/api.js';
import {
  accessPageHtml,
  createAccessRouter,
  requireAppAccess,
  requireAppPageAccess
} from './services/appAccess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/access', createAccessRouter());
  app.use('/api', requireAppAccess, apiRouter);
  app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(publicDir, 'styles.css'));
  });
  app.get('/access', (req, res) => {
    res.type('html').send(accessPageHtml(req.query.returnTo));
  });
  app.use(requireAppPageAccess);
  app.use(express.static(publicDir));

  return app;
}

export const app = createApp();
