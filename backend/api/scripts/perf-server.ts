/**
 * Load-test harness for performance.js.
 *
 * Starts the real Express app from src/index.ts, but skips connectDatabase(),
 * so the load test can run on a machine with no PostgreSQL instance.
 *
 * Usage:  npm run perf:server
 */

import { app } from '../src/index';

const PORT = Number(process.env.PERF_PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`[perf] ClaimFlow API listening on http://localhost:${PORT} (no database)`);
});
