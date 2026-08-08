#!/usr/bin/env node
/**
 * Test pyramid tally.
 *
 * docs/final_report_testing.md claims a 45/30/15/10 split across unit,
 * integration, E2E and performance tests. Until this script existed there was
 * no way to reproduce those percentages — they were asserted, not measured.
 *
 * Reads the machine-generated artifacts each runner emits and writes
 * docs/testing-evidence/pyramid.md, so the figure in the report traces back to
 * a committed file rather than a claim.
 *
 * Usage:
 *   npm run test:evidence     # run every tier, then tally
 *   npm run test:pyramid      # tally whatever artifacts already exist
 *
 * Counting rules, stated here because the report cites them:
 *
 *  - A Jest or Playwright test case counts when it actually executed, i.e.
 *    it passed or it failed. Skipped, pending and todo cases are reported
 *    separately and never counted. This matters: the integration suites
 *    skip themselves when DATABASE_URL_TEST is unset, and counting those
 *    would inflate the integration tier with tests that never ran — exactly
 *    the credibility problem this script exists to fix.
 *
 *  - k6 has no test cases, so a performance "case" is defined as one named
 *    check() plus one declared threshold. Both are pass/fail assertions
 *    emitted by k6 --summary-export, so both are countable from its JSON.
 *
 * Tier is decided by file path, which is why integration suites are named
 * *.integration.test.ts.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORTS = join(ROOT, 'reports');
const OUT = join(ROOT, 'docs', 'testing-evidence', 'pyramid.md');

/** Report target from docs/final_report_testing.md section 3.1. */
const TARGET = { unit: 45, integration: 30, e2e: 15, performance: 10 };

const tiers = {
  unit: { ran: 0, skipped: 0, sources: [] },
  integration: { ran: 0, skipped: 0, sources: [] },
  e2e: { ran: 0, skipped: 0, sources: [] },
  performance: { ran: 0, skipped: 0, sources: [] },
};

const missing = [];

function readJson(name) {
  const path = join(REPORTS, name);
  if (!existsSync(path)) {
    missing.push(name);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    missing.push(`${name} (unparseable: ${err.message})`);
    return null;
  }
}

/** Jest counts as ran when status is passed or failed. */
function tallyJest(report, name, classify) {
  if (!report?.testResults) return;
  let ran = 0;
  let skipped = 0;

  for (const suite of report.testResults) {
    // Jest uses testFilePath in --json output; --outputFile variants use name.
    const file = suite.testFilePath ?? suite.name ?? '';
    for (const assertion of suite.assertionResults ?? []) {
      const tier = classify(file);
      if (assertion.status === 'passed' || assertion.status === 'failed') {
        tiers[tier].ran += 1;
        ran += 1;
      } else {
        tiers[tier].skipped += 1;
        skipped += 1;
      }
    }
  }

  const tiersTouched = new Set(
    (report.testResults ?? []).map((s) => classify(s.testFilePath ?? s.name ?? '')),
  );
  for (const tier of tiersTouched) {
    tiers[tier].sources.push(`reports/${name}`);
  }
  return { ran, skipped };
}

/** Playwright nests specs arbitrarily deep inside suites. */
function tallyPlaywright(report, name) {
  if (!report) return;

  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        // Playwright marks a test 'skipped' at this level; anything else
        // (expected, unexpected, flaky) actually executed.
        if (test.status === 'skipped') tiers.e2e.skipped += 1;
        else tiers.e2e.ran += 1;
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };

  for (const suite of report.suites ?? []) walk(suite);
  tiers.e2e.sources.push(`reports/${name}`);
}

/**
 * k6 --summary-export. Counts named checks plus declared thresholds.
 * Checks live under root_group, nested through groups.
 */
function tallyK6(report, name) {
  if (!report) return;

  const walkGroup = (group) => {
    for (const check of group?.checks ?? []) {
      // A check with zero passes and zero fails never executed.
      const total = (check.passes ?? 0) + (check.fails ?? 0);
      if (total > 0) tiers.performance.ran += 1;
      else tiers.performance.skipped += 1;
    }
    for (const child of Object.values(group?.groups ?? {})) walkGroup(child);
  };

  walkGroup(report.root_group);

  for (const metric of Object.values(report.metrics ?? {})) {
    const thresholds = metric?.thresholds;
    if (!thresholds) continue;
    tiers.performance.ran += Object.keys(thresholds).length;
  }

  tiers.performance.sources.push(`reports/${name}`);
}

// --- gather -----------------------------------------------------------------

const backend = readJson('jest-backend.json');
const frontend = readJson('jest-frontend.json');
const playwright = readJson('playwright.json');
const perf = readJson('perf-summary.json');

tallyJest(backend, 'jest-backend.json', (file) =>
  /\.integration\.test\.[tj]s$/.test(file.replace(/\\/g, '/')) ? 'integration' : 'unit',
);
tallyJest(frontend, 'jest-frontend.json', () => 'unit');
tallyPlaywright(playwright, 'playwright.json');
tallyK6(perf, 'perf-summary.json');

// --- render -----------------------------------------------------------------

const total = Object.values(tiers).reduce((sum, t) => sum + t.ran, 0);
const pct = (n) => (total === 0 ? 0 : (n / total) * 100);
const fmt = (n) => `${n.toFixed(1)}%`;

const LABEL = {
  unit: 'Unit (Jest)',
  integration: 'Integration (Supertest)',
  e2e: 'End-to-end (Playwright)',
  performance: 'Performance (k6)',
};

const rows = Object.entries(tiers).map(([key, t]) => {
  const actual = pct(t.ran);
  const drift = actual - TARGET[key];
  return {
    key,
    label: LABEL[key],
    ran: t.ran,
    skipped: t.skipped,
    actual,
    target: TARGET[key],
    drift,
    sources: [...new Set(t.sources)].join(', ') || '—',
  };
});

const totalSkipped = Object.values(tiers).reduce((sum, t) => sum + t.skipped, 0);

let md = `# Test pyramid — measured

Generated by \`scripts/test-pyramid.mjs\`. Do not edit by hand; run
\`npm run test:evidence\` to regenerate.

**Total executed test cases: ${total}**

| Tier | Cases | Share | Target | Drift | Source artifact |
| --- | ---: | ---: | ---: | ---: | --- |
`;

for (const r of rows) {
  const drift = `${r.drift >= 0 ? '+' : ''}${r.drift.toFixed(1)} pp`;
  md += `| ${r.label} | ${r.ran} | ${fmt(r.actual)} | ${r.target}% | ${drift} | ${r.sources} |\n`;
}

md += `| **Total** | **${total}** | **100.0%** | **100%** | | |\n`;

md += `
## How these numbers are produced

A Jest or Playwright case counts only when it executed — passed or failed.
Skipped, pending and todo cases are excluded and reported below. The
integration suites skip themselves when \`DATABASE_URL_TEST\` is unset, so
counting skipped cases would inflate the integration tier with tests that
never ran.

k6 emits no test cases, so a performance case is defined as **one named
\`check()\` plus one declared \`threshold\`** — both are pass/fail assertions
present in \`k6 --summary-export\` output.

Tier is determined by file path. Integration suites are named
\`*.integration.test.ts\`; everything else under \`backend/api/src\` and all of
\`frontend/src\` is unit; \`frontend/e2e\` is end-to-end.

Excluded this run: **${totalSkipped}** skipped or pending case${totalSkipped === 1 ? '' : 's'}.
`;

if (missing.length) {
  md += `
> **Incomplete run.** These artifacts were absent, so their tiers read zero:
> ${missing.map((m) => `\`${m}\``).join(', ')}.
> Run \`npm run test:evidence\` to regenerate all four.
`;
}

md += `
## Reproducing

\`\`\`bash
npm run test:evidence
\`\`\`

Which runs, in order:

| Tier | Command | Artifact |
| --- | --- | --- |
| Unit + integration (backend) | \`npx jest --json --outputFile=../../reports/jest-backend.json\` | \`reports/jest-backend.json\` |
| Unit (frontend) | \`npx jest --json --outputFile=../reports/jest-frontend.json\` | \`reports/jest-frontend.json\` |
| End-to-end | \`npx playwright test --reporter=json\` | \`reports/playwright.json\` |
| Performance | \`k6 run --summary-export=reports/perf-summary.json backend/api/performance.js\` | \`reports/perf-summary.json\` |

\`reports/\` is gitignored — only this generated summary is committed.
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, md, 'utf-8');

// --- console summary --------------------------------------------------------

console.log(`\nTest pyramid — ${total} executed cases\n`);
for (const r of rows) {
  const bar = '#'.repeat(Math.round(r.actual / 2));
  console.log(
    `  ${r.label.padEnd(26)} ${String(r.ran).padStart(4)}  ${fmt(r.actual).padStart(6)}` +
      `  (target ${r.target}%)  ${bar}`,
  );
}
if (totalSkipped) console.log(`\n  ${totalSkipped} skipped/pending case(s) excluded.`);
if (missing.length) console.log(`  Missing artifacts: ${missing.join(', ')}`);
console.log(`\nWrote ${OUT.replace(ROOT, '.')}\n`);
