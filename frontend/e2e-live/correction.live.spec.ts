import { test, expect, request as pwRequest, Page } from '@playwright/test';

/**
 * The correction loop, end to end, against the REAL running stack
 * (web :5173, gateway :4000, api :3000). Nothing is stubbed: the claim is
 * created through the API, an approving officer sends it back through the
 * API, and every assertion below is on what the employee actually sees.
 */

const API = 'http://localhost:4000';
const SHOTS =
  '/private/tmp/claude-501/-Users-dan-NP-CET/1a798234-f1d0-418f-9f01-47910141dd16/scratchpad';

const EMPLOYEE = { email: 'demo.employee@claimflow.com', password: 'claimflow-demo' };
const MANAGER = { email: 'demo.manager@claimflow.com', password: 'claimflow-demo' };

async function api() {
  return pwRequest.newContext({ baseURL: API });
}

async function login(ctx: any, who: { email: string; password: string }) {
  const res = await ctx.post('/api/auth/login', { data: who });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/**
 * Records uncaught JS errors and console errors. Failed HTTP responses are
 * kept separately with their URL: the demo stack rate-limits repeated logins
 * (429) and serves no favicon, and neither is a fault in the page — but a
 * 4xx/5xx on anything this feature touches has to be visible, so they are
 * printed rather than swallowed.
 */
function watchForErrors(page: Page, sink: string[], network: string[]) {
  page.on('pageerror', (err) => sink.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (text.startsWith('Failed to load resource')) return;
    sink.push(`console: ${text}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) network.push(`${res.status()} ${res.url()}`);
  });
}

/** The Recent claims cards fade in on a stagger; let them land first. */
async function settle(page: Page) {
  await page.waitForTimeout(700);
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
}

test.describe('Correction requested — the submitter side', () => {
  let claimId: number;
  let displayId: string;
  const errors: string[] = [];
  const badResponses: string[] = [];

  test.beforeAll(async () => {
    const ctx = await api();
    const employeeToken = await login(ctx, EMPLOYEE);

    // Leftovers from earlier runs would put two "Correction requested" cards
    // on screen and make the assertions ambiguous, so clear them first.
    const mine = await ctx.get('/api/claims/my', { headers: auth(employeeToken) });
    const claims = (await mine.json())?.data?.claims ?? [];
    for (const c of claims) {
      if (c?.details?.correctionRequest) {
        await ctx.patch(`/api/claims/${c.id}/withdraw`, { headers: auth(employeeToken), data: {} });
      }
    }
    // Same reasoning for the bell: with everything already read, the one
    // unread row on screen must be the one this test produced.
    await ctx.patch('/api/notifications/read-all', { headers: auth(employeeToken), data: {} });

    const today = new Date().toISOString().slice(0, 10);
    const created = await ctx.post('/api/claims', {
      headers: auth(employeeToken),
      data: {
        amount: 52.4,
        gstAmount: 4.32,
        merchant: 'Toast Box',
        category: 'Meal',
        expenseDate: today,
        receiptUrl: '/test-receipts/real-grab.png',
        ocrSource: 'azure',
      },
    });
    expect(created.ok()).toBeTruthy();
    claimId = (await created.json()).data.claim.id;
    displayId = `CLM-${String(claimId).padStart(3, '0')}`;

    const managerToken = await login(ctx, MANAGER);
    const sentBack = await ctx.patch(`/api/workflow/review/${claimId}`, {
      headers: auth(managerToken),
      data: {
        action: 'request-changes',
        fields: ['amount', 'gstAmount'],
        remarks: 'Receipt total reads S$46.60',
      },
    });
    expect(sentBack.ok()).toBeTruthy();
    const after = (await sentBack.json()).data.claim;
    // The claim survives: same id, same receipt, still Pending.
    expect(after.status).toBe('Pending');
    expect(after.receiptUrl).toBeTruthy();
    expect(after.details.correctionRequest.fields).toEqual(['amount', 'gstAmount']);

    await ctx.dispose();
  });

  test.beforeEach(async ({ page }) => {
    watchForErrors(page, errors, badResponses);
    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Submit & track your claims' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('the sent-back claim leads Recent claims, naming the exact fields', async ({ page }) => {
    const card = page.locator('.claim-mini-card.needs-fix');
    await expect(card).toHaveCount(1);
    await expect(card.getByText('Correction requested')).toBeVisible();

    // The named fields, in human labels — not "details do not match".
    await expect(card.locator('.fix-field')).toHaveText(['Amount', 'GST']);
    // The approver's note, attributed.
    await expect(card.getByText('Lim Wei Ming: Receipt total reads S$46.60')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Fix and resend' })).toBeVisible();

    // It is the first card in the list — ahead of ordinary pending claims.
    const first = page.locator('.claim-mini-card').first();
    await expect(first).toHaveClass(/needs-fix/);

    // Ordinary pending claims are untouched: no flag, Edit still there.
    const plain = page.locator('.claim-mini-card:not(.needs-fix)').first();
    if (await plain.count()) {
      await expect(plain.locator('.fix-request')).toHaveCount(0);
    }

    await settle(page);
    await page.screenshot({ path: `${SHOTS}/fix-card.png` });

    // Nothing bleeds sideways at either width — the document never scrolls
    // horizontally, at 1440 or at 390.
    const desktop = await noHorizontalOverflow(page);
    expect(desktop.scrollWidth).toBeLessThanOrEqual(desktop.clientWidth);

    // Both the submit wizard and the flagged claim are on the first screen at
    // 1440x900 — the employee sees the thing to act on without scrolling.
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeInViewport();
    await expect(card).toBeInViewport();

    // The Recent claims column already scrolls past one screen on this demo
    // account (five claims in an ~856px column), with or without the flag —
    // measured here rather than asserted away, so the flag's own cost is the
    // only thing this test holds to: under one claim card's worth of height.
    const scrollExtent = () =>
      page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? { scroll: main.scrollHeight, client: main.clientHeight } : null;
      });
    const withFlag = await scrollExtent();
    await page.addStyleTag({ content: '.fix-request { display: none !important; }' });
    await page.waitForTimeout(200);
    const withoutFlag = await scrollExtent();
    expect(withoutFlag!.scroll).toBeGreaterThan(withoutFlag!.client);
    expect(withFlag!.scroll - withoutFlag!.scroll).toBeLessThan(200);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await noHorizontalOverflow(page);
    expect(mobile.scrollWidth).toBeLessThanOrEqual(mobile.clientWidth);
  });

  test('the bell files it under Action needed and opens the claim', async ({ page }) => {
    await page.getByRole('button', { name: /unread notifications|Notifications/ }).click();

    const actionSection = page.locator('.notif-section[aria-label="Action needed"]');
    await expect(actionSection).toBeVisible();

    const row = page.locator('.notif-row.is-unread');
    await expect(row).toHaveCount(1);
    // It is inside the Action needed group, in the warning tone.
    await expect(actionSection.locator('.notif-row.is-unread')).toHaveCount(1);
    await expect(row).toHaveClass(/notif-row-warning/);
    await expect(row).toContainText('Fix Amount, GST on your meal claim');
    await expect(row).toContainText(
      'Open the claim, correct Amount, GST and save — it goes straight back for approval.',
    );

    await settle(page);
    await page.screenshot({ path: `${SHOTS}/fix-bell.png` });

    // Clicking navigates to the claim, exactly like the other kinds.
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/claim/${displayId}$`));
  });

  test('it holds up in dark mode', async ({ page, context }) => {
    await context.addInitScript(() =>
      window.localStorage.setItem('claimflow-theme', 'dark'),
    );
    await page.reload();
    await expect(page.locator('html.dark')).toHaveCount(1);
    await expect(page.locator('.claim-mini-card.needs-fix')).toHaveCount(1);
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/fix-dark.png` });
  });

  test('the modal highlights the named fields, and saving sends it back', async ({ page }) => {
    await page.getByRole('button', { name: 'Fix and resend' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Correct this claim' })).toBeVisible();

    // The note, once, at the top, attributed and naming the fields.
    await expect(
      dialog.getByText('Lim Wei Ming asked for: Amount, GST — Receipt total reads S$46.60'),
    ).toBeVisible();

    // Exactly the requested fields are marked; the rest stay ordinary.
    await expect(dialog.locator('.field-asked')).toHaveCount(2);
    await expect(dialog.locator('.fix-field-tag')).toHaveText([
      'Correct this',
      'Correct this',
    ]);
    const askedLabels = await dialog.locator('.field-asked .form-label').allInnerTexts();
    expect(askedLabels.join(' | ')).toContain('Total (S$)');
    expect(askedLabels.join(' | ')).toContain('GST (S$)');

    await settle(page);
    await page.screenshot({ path: `${SHOTS}/fix-modal.png` });

    // Correct the two fields and send it back.
    await dialog.locator('input[type="number"]').first().fill('46.60');
    await dialog.locator('input[type="number"]').nth(1).fill('3.85');
    await dialog.getByRole('button', { name: 'Save and send back' }).click();

    // The toast says the claim went back for approval, not merely "saved".
    await expect(page.getByText('Sent back for approval')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(
        `${displayId} is back with Lim Wei Ming, who will re-check Amount, GST. Nothing else to do.`,
      ),
    ).toBeVisible();

    // The flag is gone — the correction really cleared server-side.
    await expect(page.locator('.claim-mini-card.needs-fix')).toHaveCount(0, { timeout: 15000 });
    await page.reload();
    await expect(page.locator('.claim-mini-card.needs-fix')).toHaveCount(0, { timeout: 15000 });

    // ...and the approver was told, by the API, not by a message.
    const ctx = await api();
    const managerToken = await login(ctx, MANAGER);
    const notifs = await ctx.get('/api/notifications/my', { headers: auth(managerToken) });
    const items = (await notifs.json())?.data?.items ?? [];
    const mine = items.find(
      (n: any) => n.claimId === claimId && n.kind === 'correction-submitted',
    );
    expect(mine, 'approver got a correction-submitted notification').toBeTruthy();
    await ctx.dispose();
  });

  test.afterAll(() => {
    // Anything the page itself got wrong fails the run.
    expect(errors, `page errors: ${errors.join(' / ')}`).toEqual([]);
    // Failed responses are reported, minus the three the demo stack produces
    // on its own and this feature never touches: no favicon, the login rate
    // limiter on repeat runs, and a Google Fonts woff2 the CDN 404s.
    const unexpected = badResponses.filter(
      (r) => !/favicon/.test(r) && !/^429 /.test(r) && !/fonts\.gstatic\.com/.test(r),
    );
    expect(unexpected, `failed responses: ${unexpected.join(' / ')}`).toEqual([]);
  });
});
