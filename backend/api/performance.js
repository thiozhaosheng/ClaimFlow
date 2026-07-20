import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500'],
    // less than 1% of requests can fail
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Use a mock auth token that the local server accepts, or test unauthenticated routes
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // The local auth-gateway proxies /api/claims to backend/api (port 3000).
  // We can hit the gateway directly (port 4000) or the backend (port 3000).
  // Hitting the backend directly is better for pure backend load testing.
  const res = http.get('http://localhost:3000/api/docs.json', params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
