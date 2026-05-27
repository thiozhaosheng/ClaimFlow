import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error && process.env.NODE_ENV !== 'production') {
  console.warn('[constants] No .env file found. Falling back to process env only.');
}

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[constants] Required env var "${key}" is not set. ` +
        `Copy backend/api/.env.example to backend/api/.env and fill it in.`,
    );
  }
  return value;
};

const optional = (key: string, fallback: string): string => {
  return process.env[key] ?? fallback;
};

export const NODE_ENV = optional('NODE_ENV', 'development');
export const PORT = parseInt(optional('PORT', '3000'), 10);

// Secrets — no fallback. Service refuses to boot without them.
export const JWT_SECRET = required('JWT_SECRET');
export const DATABASE_URL = required('DATABASE_URL');

// Tunables — fallback OK
export const JWT_EXPIRES_IN = optional('JWT_EXPIRES_IN', '1d');

// CORS allowlist (comma-separated). In dev, defaults to the Vite frontend.
export const CORS_ORIGINS = optional(
  'CORS_ORIGINS',
  'http://localhost:3000,http://localhost:5173',
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Optional integrations — fine to be empty if the feature isn't wired up
export const HITPAY_API_KEY = optional('HITPAY_API_KEY', '');
export const HITPAY_SALT = optional('HITPAY_SALT', '');
