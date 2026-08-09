/**
 * k6 load test — ClaimFlow API
 *
 * Sends concurrent traffic to the running API to check latency and stability
 * under load.
 *
 * Mock SLA:
 *   - 95% of requests complete in under 500ms
 *   - fewer than 1% of requests fail
 *
 * Run:
 *   1. npm run perf:server    (terminal 1 — starts the API without a database)
 *   2. npm run test:perf      (terminal 2)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_BASE || 'http://localhost:3000';

export const options = {
  // 20 concurrent virtual users, held for 30 seconds.
  vus: 20,
  duration: '30s',
  thresholds: {
    // 95% of requests must complete below 500ms.
    http_req_duration: ['p(95)<500'],
    // Fewer than 1% of requests may fail.
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'responds under 500ms': (r) => r.timings.duration < 500,
  });

  // Pace each virtual user at roughly one request per second.
  sleep(1);
}
