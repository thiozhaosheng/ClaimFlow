import { test, expect } from '@playwright/test';

test.describe('Employee Claim Submission', () => {
  /**
   * The ClaimFlow API is stubbed at the network boundary so this journey runs
   * anywhere — including a CI runner with no backend, database or Azure
   * credentials. The browser, the React app and every UI rule under test are
   * real; only the HTTP responses are canned.
   */
  test.beforeEach(async ({ page }) => {
    // The stubbed backend keeps one piece of state: whether a claim has been
    // submitted yet. Before submission the employee's list is empty; after it,
    // the list returns the new claim — so the test can verify the claim really
    // appears on screen rather than only trusting the success toast.
    const submittedClaims: Array<Record<string, unknown>> = [];
    let signedIn = false;

    const claimList = () => ({
      status: 'success',
      results: submittedClaims.length,
      data: { claims: submittedClaims },
    });

    const employee = {
      email: 'demo.employee@claimflow.com',
      name: 'Demo Employee',
      role: 'Employee',
    };

    // Session check: unauthenticated until the login call succeeds, then it
    // keeps returning the user — so a page reload stays signed in, the way a
    // real session behaves.
    await page.route('**/api/auth/me', route =>
      signedIn
        ? route.fulfill({ json: { status: 'success', data: { user: employee } } })
        : route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
    );

    await page.route('**/api/auth/login', route => {
      signedIn = true;
      return route.fulfill({ json: { token: 'mock-token', user: employee } });
    });

    // Receipt OCR — returns a fully-read Azure result.
    await page.route('**/api/claims/parse-receipt', route =>
      route.fulfill({
        json: {
          data: {
            total: 20.0,
            merchant: 'GrabTest',
            category: 'Transport',
            source: 'azure',
            receiptUrl: 'http://mock',
            viewUrl: 'http://mock',
          },
        },
      }),
    );

    // Employee claim list — reflects whatever has been submitted so far.
    await page.route('**/api/claims/my', route => route.fulfill({ json: claimList() }));

    // Notifications bell.
    await page.route('**/api/notifications/my', route =>
      route.fulfill({ json: { status: 'success', data: { notifications: [] } } }),
    );
    await page.route('**/api/notifications/live**', route =>
      route.fulfill({ status: 204, body: '' }),
    );

    // Claim submission + the manager/finance list endpoint.
    await page.route('**/api/claims', route => {
      if (route.request().method() === 'POST') {
        const claim = {
          id: 1,
          category: 'Transport',
          amount: 20,
          merchant: 'GrabTest',
          status: 'Pending',
          expenseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        // Record it so the employee's list shows it on the next fetch.
        submittedClaims.push(claim);
        // The policy engine is advisory: nothing auto-approves. An in-policy
        // claim comes back with recommendation 'approve' and the approver
        // still makes the final decision.
        return route.fulfill({
          status: 201,
          json: {
            status: 'success',
            data: { claim },
            policy: {
              outcome: 'auto-approve',
              ruleId: 'auto-approve-transport',
              message: 'Transport claim within limits.',
              recommendation: 'approve',
              recommendationWithheldByOcr: false,
            },
          },
        });
      }
      return route.fulfill({ json: claimList() });
    });
  });
  test('a claim with no receipt is blocked at the Receipt step', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(page.getByRole('heading', { name: 'Submit & track your claims' })).toBeVisible();

    // The form is now a 3-step wizard and it opens on the Receipt step.
    const steps = page.getByRole('list', { name: 'Claim submission steps' });
    await expect(steps).toBeVisible();
    await expect(steps.getByText('Receipt')).toBeVisible();
    await expect(steps.getByText('Details')).toBeVisible();
    await expect(steps.getByText('Review')).toBeVisible();

    // With no receipt attached, the gate fires here, on step one: the
    // requirement is stated and Continue will not advance — the Details and
    // Review steps (and the Submit button on Review) are unreachable, so the
    // claim cannot be submitted at all.
    //
    // This used to assert the string "block-missing-receipt", which pinned a
    // rule id that is not in policies.json — the real rule is
    // block-missing-receipt-over-threshold and it only fires above S$50. The
    // form requires a receipt every time because the amount, GST and date are
    // read off it, so the requirement is what to assert, not a borrowed id.
    await expect(page.getByText(/Every claim needs a receipt/)).toBeVisible();
    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(continueButton).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Submit claim' })).toHaveCount(0);
  });

  test('GST above the total is caught at the field, not at submit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(page.getByRole('heading', { name: 'Submit & track your claims' })).toBeVisible();

    await page.setInputFiles('input[type="file"]', 'public/test-receipts/real-grab.png');
    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(continueButton).toBeEnabled({ timeout: 15000 });
    await continueButton.click();

    await page.getByPlaceholder('e.g., Grab to client meeting').fill('GST check');
    await page.getByPlaceholder('e.g., Grab, NTUC FairPrice, Toast Box').fill('GrabTest');
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(today);
    await page.getByPlaceholder('e.g., Office (Toa Payoh)').fill('Home');
    await page.getByPlaceholder('e.g., Client (Marina Bay)').fill('Office');
    await page.getByRole('combobox').nth(1).selectOption({ label: 'Client meeting' });
    await page.getByRole('combobox').nth(2).selectOption({ label: 'Morning (06-12)' });

    // Amount is the first number field, GST the second.
    const numbers = page.locator('input[type="number"]');
    await numbers.first().fill('20.00');
    await numbers.nth(1).fill('50.00');

    // The API refuses this (checkClaimAmounts). The point of the test is that
    // the submitter is told here, beside the field, instead of filling the rest
    // of the form and being refused after pressing Submit.
    await expect(page.getByText('GST cannot be more than the total on the receipt.')).toBeVisible();
    await expect(continueButton).toBeDisabled();

    // Correcting it releases the step.
    await numbers.nth(1).fill('1.63');
    await expect(page.getByText('GST cannot be more than the total on the receipt.')).toHaveCount(0);
    await expect(continueButton).toBeEnabled();
  });

  test('an employee can submit a claim through the Receipt → Details → Review wizard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(page.getByRole('heading', { name: 'Submit & track your claims' })).toBeVisible();

    // --- Step 1: Receipt -------------------------------------------------
    await page.setInputFiles('input[type="file"]', 'public/test-receipts/real-grab.png');

    // The stubbed parse endpoint answers as Azure, so the badge must say the
    // receipt was read live — not filled with demo data. The copy is plain
    // words now ("Read from your receipt" / "Live scan"): vendor names are
    // jargon to a claimant, and the badge's job is only to prove liveness.
    // (`first()` because a toast with the same title also appears.)
    await expect(
      page.getByText('Read from your receipt').first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Live scan').first()).toBeVisible();
    await expect(page.getByText('View uploaded image')).toBeVisible({ timeout: 15000 });

    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // --- Step 2: Details -------------------------------------------------
    await page.getByPlaceholder('e.g., Grab to client meeting').fill('Test Playwright Claim');
    await page.getByPlaceholder('e.g., Grab, NTUC FairPrice, Toast Box').fill('GrabTest');
    await page.locator('input[type="number"]').first().fill('20.00');

    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(today);

    // Transport's per-category fields. Combobox 0 is the category select.
    await page.getByPlaceholder('e.g., Office (Toa Payoh)').fill('Home');
    await page.getByPlaceholder('e.g., Client (Marina Bay)').fill('Office');
    await page.getByRole('combobox').nth(1).selectOption({ label: 'Client meeting' });
    await page.getByRole('combobox').nth(2).selectOption({ label: 'Morning (06-12)' });

    await continueButton.click();

    // --- Step 3: Review --------------------------------------------------
    // The summary shows what will be submitted, and the advisory policy
    // preflight says the claim is in policy — recommended, never auto-approved.
    await expect(page.getByText('Test Playwright Claim')).toBeVisible();
    await expect(page.getByText('S$20.00').first()).toBeVisible();
    await expect(
      page.getByText('Within policy — will be marked ready to approve'),
    ).toBeVisible();
    await expect(page.getByText('Your approver still gives the final decision.')).toBeVisible();

    await page.getByRole('button', { name: 'Submit claim' }).click();

    // Verify the UI actually changed in response to the action:
    // 1. a toast confirms the claim was accepted with the advisory wording, and
    await expect(page.getByText('Submitted, marked ready to approve')).toBeVisible({ timeout: 10000 });
    // 2. the toast names the claim and says the approver still decides, and
    await expect(
      page.getByText(/CLM-001 \(Transport · S\$20\.00\) is within policy/),
    ).toBeVisible();
    // 3. the wizard resets to the Receipt step for the next claim, and
    await expect(page.getByText(/Every claim needs a receipt/)).toBeVisible({ timeout: 10000 });
    // 4. the claim appears in the employee's claim list, and survives a reload
    //    — so the result is really on screen, not just an optimistic toast.
    await page.reload();
    const claimRow = page.getByRole('button', {
      name: /Transport claim CLM-001[\s\S]*S\$20\.00, Pending/,
    });
    await expect(claimRow).toBeVisible({ timeout: 10000 });
    await expect(claimRow).toBeInViewport({ timeout: 5000 });

    // When recording for submission, hold on the success state briefly so the
    // confirmation is readable in the video. Skipped in normal and CI runs.
    if (process.env.RECORD) await page.waitForTimeout(2500);
  });
});
