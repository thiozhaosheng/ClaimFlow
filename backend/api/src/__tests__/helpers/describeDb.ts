/**
 * The skip gate for the integration tier.
 *
 * Every `*.integration.test.ts` suite opens with `describeDb(...)` instead of
 * `describe(...)`. When DATABASE_URL_TEST is unset the whole suite is skipped
 * rather than failed, so `npx jest` stays green on a machine with no Postgres —
 * which is the entire reason the unit tier can run in CI unattended.
 *
 * Reading the variable here, at module load, is deliberate. jest.env.ts has
 * already run by this point (it is a `setupFiles` entry, which executes before
 * the test framework), so DATABASE_URL_TEST is either present or it never will
 * be. There is no later moment at which it could appear.
 *
 * WHY THE GATE IS ON *_TEST AND NOT DATABASE_URL:
 * the fixtures in ./db.ts truncate tables. If the gate were DATABASE_URL, a
 * developer with a normal .env would have their development database silently
 * emptied the first time they ran the suite. Requiring a separately-named
 * variable means reaching a database is always a deliberate act.
 */

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

/** True when a throwaway database has been configured for this run. */
export const hasTestDatabase = Boolean(testDatabaseUrl);

/**
 * `describe` that skips itself when no test database is configured.
 *
 * Usage:
 *   describeDb('Claims API (real database)', () => { ... })
 */
export const describeDb = hasTestDatabase ? describe : describe.skip;

/**
 * Printed once per run when the tier is skipped, so a green result is never
 * mistaken for a passing one. Without this the suite reports "0 total" and
 * looks indistinguishable from a tier that ran and found nothing.
 */
if (!hasTestDatabase) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n  [integration] SKIPPED — DATABASE_URL_TEST is not set.\n' +
      '  These suites did not run. Do not cite them as coverage.\n' +
      '  To enable: cp .env.test.example .env.test and point DATABASE_URL_TEST\n' +
      '  at a THROWAWAY database (the fixtures truncate tables).\n',
  );
}
