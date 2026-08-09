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
        return route.fulfill({
          status: 201,
          json: {
            status: 'success',
            data: { claim },
            policy: { outcome: 'route-to-human', ruleId: 'default', message: 'Sent to a reviewer.' },
          },
        });
      }
      return route.fulfill({ json: claimList() });
    });
  });
  test('an employee can submit a claim with a receipt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(page.getByRole('heading', { name: 'Submit & track your claims' })).toBeVisible();

    // Upload receipt
    await page.setInputFiles('input[type="file"]', 'public/test-receipts/real-grab.png');

    // Give it a moment to show "Receipt attached" or simulate OCR
    await expect(page.getByText('Demo parser')).not.toBeVisible();
    await expect(page.getByText('View uploaded image')).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('e.g., Grab to client meeting').fill('Test Playwright Claim');
    await page.getByPlaceholder('e.g., Grab, NTUC FairPrice, Toast Box').fill('GrabTest');
    await page.locator('input[type="number"]').first().fill('20.00');

    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(today);

    await page.getByPlaceholder('e.g., Office (Toa Payoh)').fill('Home');
    await page.getByPlaceholder('e.g., Client (Marina Bay)').fill('Office');
    await page.getByRole('combobox').nth(1).selectOption({ label: 'Client meeting' });
    await page.getByRole('combobox').nth(2).selectOption({ label: 'Morning (06-12)' });

    await page.getByRole('button', { name: 'Submit claim' }).click();

    // Verify the UI actually changed in response to the action:
    // 1. the submission form closes,
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    // 2. a success toast confirms the claim was accepted, and
    await expect(page.getByText('Claim submitted')).toBeVisible({ timeout: 10000 });
    // 3. the toast names the claim and its pending status, and
    await expect(page.getByText(/is now pending review/i)).toBeVisible();
    // 4. the claim appears in the employee's claim list, and survives a reload
    //    — so the result is really on screen, not just an optimistic toast.
    await page.reload();
    const claimRow = page.getByRole('button', {
      name: /Transport Claim[\s\S]*Pending[\s\S]*S\$20\.00/,
    });
    await expect(claimRow).toBeVisible({ timeout: 10000 });
    await expect(claimRow).toBeInViewport({ timeout: 5000 });

    // When recording for submission, hold on the success state briefly so the
    // confirmation is readable in the video. Skipped in normal and CI runs.
    if (process.env.RECORD) await page.waitForTimeout(2500);
  });
});
