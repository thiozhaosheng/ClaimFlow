/**
 * Load-test harness.
 *
 * Boots the REAL ClaimFlow Express application — the same `app` that
 * `src/index.ts` serves in production, with helmet, CORS, JSON body parsing,
 * rate limiting and the full router tree — but skips `connectDatabase()`.
 *
 * That lets `performance.js` (k6) measure the API's HTTP stack on a machine
 * with no PostgreSQL instance. Endpoints that read or write the database are
 * deliberately out of scope for this run; see docs for the scope note.
 *
 * Usage:  npx ts-node scripts/perf-server.ts
 */

import { app } from '../src/index';

const PORT = Number(process.env.PERF_PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`[perf] ClaimFlow API listening on http://localhost:${PORT} (no database)`);
});
