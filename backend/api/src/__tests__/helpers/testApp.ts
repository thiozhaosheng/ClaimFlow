/**
 * Composes an Express app from the real routers for Supertest.
 *
 * WHY THIS EXISTS, and what it costs:
 *
 * src/index.ts never exports `app`. It builds the app at module scope and ends
 * with `startServer().catch(...)`, which calls connectDatabase() and
 * app.listen() at import time. Importing it from a test would therefore try to
 * bind a port and connect a database as a side effect of `require`.
 *
 * Extracting an app.ts would be the right fix, but that is a production change
 * and out of scope for the testing capstone. So this helper mirrors index.ts's
 * assembly instead.
 *
 * WHAT IS FAITHFUL: the same express.json body limit, the same apiRoutes tree
 * (so real routers, real auth middleware, real controllers, real Prisma), and
 * a copy of the same final error handler.
 *
 * WHAT IS NOT COVERED, and must not be claimed as covered:
 *   - helmet security headers
 *   - the CORS allowlist in security.middleware.ts
 *   - authLimiter (5 per 15 min) and apiLimiter (120 per min)
 *
 * Those are mounted in index.ts, above the router tree, so nothing that
 * reaches this app passes through them. docs/final_report_testing.md claimed
 * the integration tier validates "rate limiting"; it cannot, and that claim
 * has been removed. Rate limiting is only observable against the real server.
 */
import express from 'express';
import apiRoutes from '../../routes/index';
import { NODE_ENV } from '../../config/constants';

export function makeApp(): express.Express {
  const app = express();

  // Matches index.ts. The limit matters: a payload-too-large rejection is a
  // different code path from a validation failure.
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRoutes);

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'claimflow-api', env: NODE_ENV });
  });

  // Copy of the index.ts final handler. Without it, an error thrown inside a
  // router surfaces as Express's default HTML 500 and assertions on JSON
  // bodies fail for a misleading reason.
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const message = err?.message ?? 'Internal server error';
      if (err?.message?.startsWith('CORS:')) {
        return res.status(403).json({ message });
      }
      return res.status(500).json({
        message: NODE_ENV === 'production' ? 'Internal server error' : message,
      });
    },
  );

  return app;
}
