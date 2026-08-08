import { test, expect } from '@playwright/test';

test.describe('Employee Claim Submission', () => {
  /**
   * The ClaimFlow API is stubbed at the network boundary so this journey runs
   * anywhere — including a CI runner with no backend, database or Azure
   * credentials. The browser, the React app and every UI rule under test are
   * real; only the HTTP responses are canned.
   */
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/me', route =>
      route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
    );

    await page.route('**/api/auth/login', route =>
      route.fulfill({
        json: {
          token: 'mock-token',
          user: {
            email: 'demo.employee@claimflow.com',
            name: 'Demo Employee',
            role: 'Employee',
          },
        },
      }),
    );

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

    // Employee claim list — empty, in the envelope the app expects.
    await page.route('**/api/claims/my', route =>
      route.fulfill({ json: { status: 'success', results: 0, data: { claims: [] } } }),
    );

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
        return route.fulfill({
          status: 201,
          json: {
            status: 'success',
            data: { claim: { id: 1, category: 'Transport', amount: 20, status: 'Pending' } },
            policy: { outcome: 'route-to-human', ruleId: 'default', message: 'Sent to a reviewer.' },
          },
        });
      }
      return route.fulfill({ json: { status: 'success', results: 0, data: { claims: [] } } });
    });
  });
  test('should fail to submit without a receipt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(page.getByRole('heading', { name: 'Submit & track your claims' })).toBeVisible();

    await page.getByPlaceholder('e.g., Grab to client meeting').fill('Missing Receipt Claim');
    await page.getByPlaceholder('e.g., Grab, NTUC FairPrice, Toast Box').fill('GrabTest');
    await page.locator('input[type="number"]').first().fill('20.00');

    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(today);

    await page.getByPlaceholder('e.g., Office (Toa Payoh)').fill('Home');
    await page.getByPlaceholder('e.g., Client (Marina Bay)').fill('Office');
    await page.getByRole('combobox').nth(1).selectOption({ label: 'Client meeting' });
    await page.getByRole('combobox').nth(2).selectOption({ label: 'Morning (06-12)' });

    const submitBtn = page.getByRole('button', { name: 'Submit claim' });
    await expect(submitBtn).toBeDisabled();
    await expect(page.getByText('block-missing-receipt')).toBeVisible();
  });

  test('should login and submit a claim with a receipt', async ({ page }) => {
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
    // 3. the toast names the claim and its pending status.
    await expect(page.getByText(/is now pending review/i)).toBeVisible();
  });
});
