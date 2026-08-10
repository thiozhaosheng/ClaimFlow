#!/usr/bin/env node
/**
 * Ephemeral database runner for the integration tier.
 *
 * Creates a throwaway database, pushes the schema into it, seeds it, runs the
 * integration suites against it, and drops it again — always, including on
 * failure or Ctrl-C.
 *
 * WHY THIS EXISTS. The fixtures in src/__tests__/helpers/db.ts truncate Claim,
 * AuditLog and Notification between test cases. Pointed at the deployed
 * database that would delete real claims and their audit trail, which is the
 * compliance record itself. A dedicated long-lived test database would work but
 * is one more thing to keep in step with the schema. A database that exists
 * only for the length of one test run avoids both problems: nothing to
 * maintain, and no path by which the suites can reach live data.
 *
 * HOST-AGNOSTIC BY DESIGN. The script does not know or care where Postgres is.
 * It creates its database on whatever server the admin URL points at:
 *
 *   locally   INTEGRATION_DB_ADMIN_URL, or DATABASE_URL from .env — your Azure
 *             Flexible Server. A second database on an existing server costs
 *             nothing beyond its own storage, and it is gone by the end.
 *   in CI     the postgres service container in .github/workflows/node-ci.yml.
 *             GitHub runners have dynamic egress IPs, so reaching Azure from CI
 *             would mean opening the firewall to a range you cannot pin down.
 *             A service container sidesteps that entirely.
 *
 * CREDENTIALS. Read from the environment, never written anywhere. Every log
 * line goes through maskUrl(), so a password cannot reach the console, CI logs,
 * or a screenshot of either.
 *
 * Usage:
 *   npm run test:integration:ephemeral            (from backend/api)
 *   INTEGRATION_DB_ADMIN_URL=postgres://... npm run test:integration:ephemeral
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// .env.test first: dotenv does not overwrite what is already set, so a value
// there wins over .env, matching how jest.env.ts resolves the same variables.
dotenv.config({ path: path.join(apiDir, '.env.test') });
dotenv.config({ path: path.join(apiDir, '.env') });

const adminUrl = process.env.INTEGRATION_DB_ADMIN_URL || process.env.DATABASE_URL;

/**
 * `--evidence` runs BOTH jest projects and writes the JSON report that
 * scripts/test-pyramid.mjs tallies, rather than the integration project alone.
 * The pyramid counts executed cases per tier from that one file, so the
 * integration tier can only be non-zero if the run that produced it had a
 * database.
 */
const evidenceMode = process.argv.includes('--evidence');

const EVIDENCE_ARGS = [
  'jest',
  '--runInBand',
  '--json',
  '--outputFile=../../reports/jest-backend.json',
];

if (!adminUrl) {
  // Without a database the integration tier cannot run. In evidence mode that
  // must not break the report: fall through to a normal jest run, where the
  // suites skip themselves and the pyramid honestly records the tier as zero.
  // Failing here instead would leave `npm run test:evidence` broken on any
  // machine without database access.
  if (evidenceMode) {
    console.warn(
      '\n[integration-db] No database URL — running without the integration tier.\n' +
        '[integration-db] The pyramid will report integration at 0%. That is accurate, not a bug.\n',
    );
    const status = spawnSync('npx', EVIDENCE_ARGS, {
      cwd: apiDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }).status;
    process.exit(status ?? 1);
  }

  console.error(
    '\nNo database URL available.\n' +
      'Set INTEGRATION_DB_ADMIN_URL, or provide DATABASE_URL in backend/api/.env.\n' +
      'The account it names must be able to CREATE DATABASE.\n',
  );
  process.exit(1);
}

/**
 * Splits a Postgres URL without parsing the credentials.
 *
 * `new URL()` is wrong for this job: a password containing "/" or "?" — both
 * legal, and both present in real Azure-generated passwords — makes it parse
 * the wrong thing as the path. Everything up to and including the last "@" is
 * treated as an opaque prefix and copied through byte-for-byte, so whatever the
 * password contains survives untouched.
 */
function splitPostgresUrl(url) {
  const at = url.lastIndexOf('@');
  if (at === -1) throw new Error('Database URL has no credentials section');

  const prefix = url.slice(0, at + 1); // postgresql://user:password@
  const afterHost = url.slice(at + 1); // host:port/dbname?params

  const slash = afterHost.indexOf('/');
  if (slash === -1) throw new Error('Database URL names no database');

  const host = afterHost.slice(0, slash);
  const rest = afterHost.slice(slash + 1);

  const q = rest.indexOf('?');
  const database = q === -1 ? rest : rest.slice(0, q);
  const params = q === -1 ? '' : rest.slice(q);

  return {
    database,
    withDatabase: name => `${prefix}${host}/${name}${params}`,
  };
}

const { database: adminDatabase, withDatabase } = splitPostgresUrl(adminUrl);

/** Replaces the credentials with a fixed marker for safe logging. */
const maskUrl = url => url.replace(/\/\/[^@]*@/, '//***:***@');

/**
 * Unique per run, so two runs — a laptop and a CI job against the same server —
 * cannot collide and drop each other's database mid-test. Lowercase and
 * underscore only, which is also what the identifier guard below requires.
 */
const testDbName = `claimflow_test_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;

if (!/^[a-z0-9_]+$/.test(testDbName)) {
  throw new Error(`Refusing to use unsafe database identifier: ${testDbName}`);
}

const testUrl = withDatabase(testDbName);

/**
 * The maintenance connection. CREATE DATABASE cannot run from inside the
 * database being created, so this connects to `postgres` — which exists on
 * every server, Azure Flexible Server included.
 *
 * If the admin URL already points at `postgres`, reuse it as-is.
 */
const maintenanceUrl = adminDatabase === 'postgres' ? adminUrl : withDatabase('postgres');

/** Runs a command with extra env, streaming output straight through. */
function run(command, args, env, label) {
  const result = spawnSync(command, args, {
    cwd: apiDir,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });

  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  return result.status ?? 1;
}

/**
 * Raw SQL over a Prisma client aimed at the maintenance database.
 *
 * Prisma rather than `pg` deliberately: @prisma/client is already a dependency,
 * so the integration tier does not drag a second Postgres driver into the tree
 * for the sake of two statements. $executeRawUnsafe issues the statement
 * directly, which matters because CREATE DATABASE and DROP DATABASE are both
 * illegal inside a transaction block.
 */
async function withMaintenanceClient(fn) {
  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient({ datasources: { db: { url: maintenanceUrl } } });
  try {
    return await fn(client);
  } finally {
    await client.$disconnect();
  }
}

async function createDatabase() {
  await withMaintenanceClient(c => c.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`));
}

/**
 * Best-effort teardown. Never throws: a failure to drop must not mask the test
 * result that the caller actually cares about, and an orphaned database is a
 * far smaller problem than a run that reports the wrong exit code.
 */
async function dropDatabase() {
  try {
    await withMaintenanceClient(async c => {
      // Terminate stragglers first. A connection left open by a crashed worker
      // makes DROP DATABASE block indefinitely; WITH (FORCE) covers this on
      // PG 13+, but the explicit terminate keeps older servers working too.
      await c.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = '${testDbName}' AND pid <> pg_backend_pid()`,
      );
      await c.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${testDbName}"`);
    });
    console.log(`\n[integration-db] dropped ${testDbName}`);
  } catch (error) {
    console.warn(
      `\n[integration-db] WARNING: could not drop ${testDbName}: ${error.message}\n` +
        `[integration-db] Remove it by hand: DROP DATABASE "${testDbName}";\n`,
    );
  }
}

let dropped = false;
async function cleanupOnce() {
  if (dropped) return;
  dropped = true;
  await dropDatabase();
}

// Ctrl-C and kill must still drop the database, or an interrupted run leaves
// one behind on the server every time.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await cleanupOnce();
    process.exit(130);
  });
}

async function main() {
  console.log(`[integration-db] server:   ${maskUrl(maintenanceUrl)}`);
  console.log(`[integration-db] creating: ${testDbName}`);

  await createDatabase();

  try {
    // Schema. --skip-generate because the client is already generated against
    // the same schema; regenerating here only costs time.
    const pushStatus = run(
      'npx',
      ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'],
      { DATABASE_URL: testUrl, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1' },
      'prisma db push',
    );
    if (pushStatus !== 0) return pushStatus;

    // Fixtures. loadRoleUsers() expects the three demo accounts plus a second
    // Employee, all of which prisma/seed.ts creates.
    const seedStatus = run(
      'npx',
      ['ts-node', 'prisma/seed.ts'],
      { DATABASE_URL: testUrl },
      'prisma seed',
    );
    if (seedStatus !== 0) return seedStatus;

    // --runInBand: the suites truncate shared tables, so parallel workers would
    // delete each other's fixtures mid-assertion.
    const jestArgs = evidenceMode
      ? EVIDENCE_ARGS
      : ['jest', '--selectProjects', 'integration', '--runInBand'];

    console.log(
      `\n[integration-db] running ${evidenceMode ? 'all suites (evidence)' : 'integration suites'}\n`,
    );
    return run('npx', jestArgs, { DATABASE_URL_TEST: testUrl }, 'jest');
  } finally {
    await cleanupOnce();
  }
}

main()
  .then(code => process.exit(code))
  .catch(async error => {
    console.error(`\n[integration-db] failed: ${error.message}`);
    await cleanupOnce();
    process.exit(1);
  });
