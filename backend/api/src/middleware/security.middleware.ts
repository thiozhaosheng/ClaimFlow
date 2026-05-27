import rateLimit from 'express-rate-limit';
import cors, { CorsOptions } from 'cors';
import { CORS_ORIGINS, NODE_ENV } from '../config/constants';

const isProduction = NODE_ENV === 'production';

// CORS allowlist from env. In dev, also allow requests with no origin
// (curl, server-to-server, mobile webviews).
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      if (isProduction) {
        return callback(new Error('Origin required in production'));
      }
      return callback(null, true);
    }
    if (CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin "${origin}" not in allowlist`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

export const corsMiddleware = cors(corsOptions);

// Auth endpoints: aggressive per-IP limit to slow brute-force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

// General API endpoints: loose limit, mostly to deter scraping/abuse.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded. Please slow down.' },
});
