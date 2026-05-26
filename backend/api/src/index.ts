import express from 'express';
import helmet from 'helmet';
import { connectDatabase } from './config/database';
import apiRoutes from './routes/index';
import { PORT, NODE_ENV } from './config/constants';
import {
  corsMiddleware,
  authLimiter,
  apiLimiter,
} from './middleware/security.middleware';

const app = express();

// Trust the proxy in front of us (Azure App Service, nginx, etc.) so that
// req.ip and rate-limiting work against the real client IP, not the proxy.
app.set('trust proxy', 1);

// Security headers — sane defaults, can be tightened per route later.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

// Rate limits — strictest on auth (matches before mount), looser elsewhere.
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'claimflow-api', env: NODE_ENV });
});

// Final error handler — never leak stack traces to clients.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err?.message ?? 'Internal server error';
  if (err?.message?.startsWith('CORS:')) {
    console.warn('[cors] blocked:', err.message);
    return res.status(403).json({ message });
  }
  console.error('[error]', err);
  return res.status(500).json({ message: NODE_ENV === 'production' ? 'Internal server error' : message });
});

const startServer = async () => {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`ClaimFlow API listening on port ${PORT} (${NODE_ENV})`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start the ClaimFlow server:', err);
  process.exit(1);
});
