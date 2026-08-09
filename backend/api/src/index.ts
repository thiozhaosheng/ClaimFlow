import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './config/database';
import apiRoutes from './routes/index';
import { swaggerSpec } from './config/swagger';
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

// Swagger UI at /api/docs, raw OpenAPI JSON at /api/docs.json.
// Mounted BEFORE the rate limiters so refreshing the docs page doesn't
// chew through the /api allowance.
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'ClaimFlow API',
    customCss: '.swagger-ui .topbar { display: none }',
  }),
);

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

// Exported so the load-test harness can start the real app without a database.
export { app, startServer };

// Only start the server when this file is run directly. When it is imported,
// the caller decides what to do with `app`.
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start the ClaimFlow server:', err);
    process.exit(1);
  });
}
