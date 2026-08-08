/**
 * Jest configuration for the ClaimFlow API.
 *
 * Split into two projects so the testing pyramid can be measured rather than
 * asserted. `docs/testing-evidence/pyramid.md` is generated from the JSON
 * reporters, and the unit/integration split is what makes those tiers
 * countable — see scripts/test-pyramid.mjs.
 *
 *   unit         fast, no I/O. Runs everywhere, including CI with no database.
 *   integration  *.integration.test.ts. Real Express routers, real middleware,
 *                real Postgres. Skips itself when DATABASE_URL_TEST is unset.
 *
 * Run one tier:  npx jest --selectProjects unit
 * Run serially:  npx jest --selectProjects integration --runInBand
 *
 * (maxWorkers is not a per-project option in Jest, so integration
 * serialisation lives in the npm script, not here.)
 *
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Scope discovery with `roots` rather than a <rootDir> glob prefix: on
  // Windows <rootDir> expands with backslashes, which never matches a
  // forward-slash testMatch pattern. `roots` is path-resolved, not globbed.
  roots: ['<rootDir>/src'],
  // Must run before any application import: constants.ts throws at module
  // load when JWT_SECRET or DATABASE_URL are missing.
  setupFiles: ['<rootDir>/jest.env.ts'],
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: 'unit',
      testMatch: ['**/?(*.)+(spec|test).ts'],
      testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['**/*.integration.test.ts'],
    },
  ],

  // Coverage is configured at the top level so `jest --coverage` reports
  // across both projects. There was previously no coverage config at all,
  // which is why the capstone report could not cite a coverage figure.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'json-summary', 'lcov'],
};
