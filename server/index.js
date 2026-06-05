import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!config.shopPassword) return next();
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== config.shopPassword) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  next();
});

app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(config.port, '0.0.0.0', () => {
  console.log(`HOMIES SHOP ASSISTANT running on http://localhost:${config.port}`);
});