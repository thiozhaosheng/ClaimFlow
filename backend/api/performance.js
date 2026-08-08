/**
 * k6 load test — ClaimFlow API
 * ---------------------------------------------------------------------------
 * Verifies latency and stability under concurrent traffic.
 *
 * Target: the real production Express application (helmet, CORS, JSON parsing,
 * rate limiting, full router tree) started by `scripts/perf-server.ts`.
 *
 * Mock SLA under test
 *   - 95% of requests complete in under 500 ms   -> http_req_duration p(95)
 *   - 99% of requests succeed (< 1% error rate)  -> http_req_failed
 *   - 99% of functional checks pass              -> checks
 *   - The OpenAPI document, the heaviest JSON payload we serve, stays under
 *     800 ms at p(95)                            -> tagged sub-threshold
 *
 * Run:
 *   1. npm run perf:server                    (terminal 1)
 *   2. npm run test:perf                      (terminal 2)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// `API_BASE` is the name the npm scripts pass; `BASE_URL` is accepted too so a
// bare `k6 run -e BASE_URL=... performance.js` keeps working.
const BASE_URL = __ENV.API_BASE || __ENV.BASE_URL || 'http://localhost:3000';

// Custom metric: proportion of responses that carried the expected payload.
const payloadValid = new Rate('payload_valid');

export const options = {
  // 20 concurrent virtual users, ramped so we can see the latency curve build.
  stages: [
    { duration: '10s', target: 20 }, // ramp up to 20 VUs
    { duration: '30s', target: 20 }, // hold 20 VUs
    { duration: '5s', target: 0 },   // ramp down
  ],
  thresholds: {
    // 95% of all requests must complete below 500ms.
    http_req_duration: ['p(95)<500'],
    // Fewer than 1% of requests may fail.
    http_req_failed: ['rate<0.01'],
    // Functional checks must pass at least 99% of the time.
    checks: ['rate>0.99'],
    // Payload integrity, not just a 200 status code.
    payload_valid: ['rate>0.99'],
    // Per-endpoint budget for the largest response we serve.
    'http_req_duration{endpoint:openapi}': ['p(95)<800'],
  },
};

export default function () {
  group('service health', function () {
    const res = http.get(`${BASE_URL}/`, {
      tags: { endpoint: 'health' },
      headers: { Accept: 'application/json' },
    });

    const ok = check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: reports service name': (r) => r.json('service') === 'claimflow-api',
      'health: responds under 500ms': (r) => r.timings.duration < 500,
      'health: sets nosniff header': (r) =>
        r.headers['X-Content-Type-Options'] === 'nosniff',
    });
    payloadValid.add(ok);
  });

  group('openapi document', function () {
    const res = http.get(`${BASE_URL}/api/docs.json`, {
      tags: { endpoint: 'openapi' },
      headers: { Accept: 'application/json' },
    });

    const ok = check(res, {
      'openapi: status is 200': (r) => r.status === 200,
      'openapi: returns JSON': (r) =>
        String(r.headers['Content-Type']).includes('application/json'),
      'openapi: documents the claims API': (r) => r.body.includes('/claims'),
    });
    payloadValid.add(ok);
  });

  // Pace each virtual user at roughly one iteration per second.
  sleep(1);
}
