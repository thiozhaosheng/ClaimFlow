import { test, expect, Page } from '@playwright/test';

/**
 * The approver's correction path, end to end against the live stack.
 *
 * Nothing here is stubbed: the claim is seeded through the real API as the
 * employee, and the approver's request goes to the real
 * PATCH /api/workflow/review/:id. The point of the feature is that a mismatch
 * no longer forces the approver out of the portal to chase the submitter, so
 * the test follows exactly that path and checks the queue reflects it.
 */

const SHOTS =
  '/private/tmp/claude-501/-Users-dan-NP-CET/1a798234-f1d0-418f-9f01-47910141dd16/scratchpad';

const DEMO_PASSWORD = 'claimflow-demo';

test.use({ viewport: { width: 1440, height: 900 } });

async function seedPendingClaim(request: any) {
  const login = await request.post('/api/auth/login', {
    data: { email: 'demo.employee@claimflow.com', password: DEMO_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();

  const created = await request.post('/api/claims', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      amount: 46.6,
      gstAmount: 3.85,
      merchant: 'Cold Storage',
      category: 'Meal',
      expenseDate: new Date().toISOString().slice(0, 10),
      receiptUrl: '/test-receipts/real-fairprice.png',
      ocrSource: 'azure',
      details: { description: 'Correction path e2e' },
    },
  });
  expect(created.ok()).toBeTruthy();
  const body = await created.json();
  const rawId = body.data.claim.id;
  return { rawId, claimId: `CLM-${String(rawId).padStart(3, '0')}` };
}

async function signInAsApprover(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Sign in as Approving Officer/i }).click();
  await expect(page.getByRole('heading', { name: 'Approval queue' })).toBeVisible();
}

test('an approver sends mismatched fields back instead of chasing the submitter', async ({
  page,
  request,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const { rawId, claimId } = await seedPendingClaim(request);
  const secondClaim = await seedPendingClaim(request);

  await signInAsApprover(page);

  const row = page.locator('.data-table tbody tr').filter({ hasText: claimId });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole('button', { name: 'Review', exact: true }).click();

  // ---- verify: every field must be answered, either way ------------------
  const continueToPolicy = page.getByRole('button', { name: /^Continue to policy/ });
  await expect(continueToPolicy).toBeDisabled();

  const answer = (field: string, choice: RegExp) =>
    page
      .getByRole('radiogroup', { name: `${field} against the receipt` })
      .getByRole('radio', { name: choice })
      .click();

  await answer('Merchant', /^Matches$/);
  await answer('Expense date', /^Matches$/);
  await expect(continueToPolicy).toBeDisabled(); // two rows still unanswered
  await answer('Amount', /Doesn.t match/);
  await answer('GST', /Doesn.t match/);

  await expect(
    page.getByText(/Amount, GST go back to Rachel Tan to fix/),
  ).toBeVisible();
  await expect(continueToPolicy).toBeEnabled();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300); // let the row transitions settle before capturing
  await page.screenshot({ path: `${SHOTS}/correction-verify.png` });

  await continueToPolicy.click();
  await page.getByRole('button', { name: 'Continue to decision' }).click();

  // ---- decision: approving what you just called wrong is not on offer ----
  await expect(page.getByRole('radio', { name: /Approve/i })).toHaveCount(0);
  await expect(
    page.getByText('Approve is unavailable while a field is marked as not matching.'),
  ).toBeVisible();
  await expect(
    page.getByRole('radio', { name: /Request correction/i }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('You marked these as not matching the receipt')).toBeVisible();
  for (const label of ['Amount', 'GST']) {
    await expect(page.locator('.review-correction-chip', { hasText: label })).toBeVisible();
  }

  await page.getByLabel('Note for the submitter (optional)').fill('Receipt total reads S$46.60');
  await page.screenshot({ path: `${SHOTS}/correction-decision.png` });

  // ---- send it: the real endpoint, the real response ---------------------
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/api/workflow/review/${rawId}`) &&
        r.request().method() === 'PATCH',
    ),
    page.getByRole('button', { name: 'Send correction request' }).click(),
  ]);
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.status).toBe('success');
  expect(payload.message).toBe('Correction requested');
  expect(payload.data.claim.details.correctionRequest.fields).toEqual([
    'amount',
    'gstAmount',
  ]);
  expect(payload.data.claim.details.correctionRequest.note).toBe(
    'Receipt total reads S$46.60',
  );
  expect(payload.data.claim.status).toBe('Pending');

  // ---- the modal closes, the toast is specific, the queue changes --------
  await expect(page.locator('.review-sheet')).toHaveCount(0);
  await expect(page.getByText('Correction requested')).toBeVisible();
  await expect(
    page.getByText(`${claimId} went back to Rachel Tan for Amount, GST.`),
  ).toBeVisible();

  await expect(row.getByText('Awaiting correction')).toBeVisible({ timeout: 15000 });
  await expect(row.getByText('Waiting on Rachel')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Review', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/correction-queue.png` });

  // The filter finds them, and the count is the real one.
  await page.getByLabel('Filter by status').selectOption('Awaiting correction');
  await expect(page.locator('.data-table tbody tr').filter({ hasText: claimId })).toBeVisible();
  const awaitingRows = await page.locator('.data-table tbody tr').count();
  await expect(page.getByText(`claims · ${awaitingRows} awaiting correction`)).toBeVisible();

  // ---- dark mode, no overflow, no page errors ---------------------------
  await page.getByRole('button', { name: /Switch to dark mode/i }).click();
  await expect(page.locator('html.dark')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/correction-queue-dark.png` });

  // The same flow again in dark, far enough in to capture both new surfaces.
  await page.getByLabel('Filter by status').selectOption('Pending');
  const second = page.locator('.data-table tbody tr').filter({ hasText: secondClaim.claimId });
  await second.getByRole('button', { name: 'Review', exact: true }).click();
  await answer('Merchant', /^Matches$/);
  await answer('Expense date', /^Matches$/);
  await answer('Amount', /Doesn.t match/);
  await answer('GST', /^Matches$/);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/correction-verify-dark.png` });
  await continueToPolicy.click();
  await page.getByRole('button', { name: 'Continue to decision' }).click();
  await expect(page.getByRole('radio', { name: /Approve/i })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/correction-decision-dark.png` });
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(pageErrors).toEqual([]);
});
