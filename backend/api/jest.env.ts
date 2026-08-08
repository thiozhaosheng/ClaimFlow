/**
 * Jest environment bootstrap — runs via `setupFiles`, i.e. before the test
 * framework and before any test file imports application code.
 *
 * Why this exists: src/config/constants.ts calls required('JWT_SECRET') and
 * required('DATABASE_URL') at module load and throws when either is unset.
 * Anything that imports src/middleware/auth.middleware.ts pulls constants in
 * transitively, so without this file the first test that exercises the real
 * `protect` middleware dies on import, before a single assertion runs.
 *
 * dotenv does not overwrite variables that are already set, so values placed
 * on process.env here win over any later dotenv.config() inside constants.ts.
 */
import path from 'path';
import dotenv from 'dotenv';

// Local developer overrides. Gitignored — copy .env.test.example to .env.test
// and point DATABASE_URL_TEST at a throwaway database.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Integration suites are gated on DATABASE_URL_TEST rather than DATABASE_URL.
 * Two reasons:
 *
 *  1. Opting in is explicit. Without it the suites skip instead of failing,
 *     so `npx jest` stays green on a machine with no Postgres.
 *  2. It makes hitting the development database structurally impossible.
 *     Integration tests truncate tables between cases; pointing them at a
 *     dev DB by accident would wipe real data. The only connection string
 *     they can ever reach is the one named *_TEST.
 */
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

// Fallbacks so importing constants.ts never throws. These are deliberately
// non-functional: the JWT secret is a fixed test string (tests sign and verify
// with the same value, which is all they need), and the database URL points at
// a database that is not expected to exist. Suites that genuinely need
// Postgres check DATABASE_URL_TEST and skip when it is absent.
process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-only-jwt-secret-do-not-use-outside-jest';
process.env.DATABASE_URL ??=
  'postgresql://claimflow:claimflow@localhost:5432/claimflow_test_unconfigured';
