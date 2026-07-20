import { test, expect } from '@playwright/test';

test.describe('Employee Claim Submission', () => {
  test('should login and submit a claim', async ({ page }) => {
    // 1. Go to the app
    await page.goto('/');

    // 2. Login as Employee using the demo button
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();

    // 3. Wait to be redirected to the employee dashboard
    await expect(page.getByRole('heading', { name: 'Submit & track your claims' })).toBeVisible();

    // 4. Fill out the claim form
    await page.getByPlaceholder('e.g., Grab to client meeting').fill('Test Playwright Claim');
    await page.getByPlaceholder('e.g., Grab, NTUC FairPrice, Toast Box').fill('GrabTest');
    await page.locator('input[type="number"]').first().fill('20.00');

    // For date, we just type a valid date (e.g. today)
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(today);

    // 5. Fill extra required Transport fields
    await page.getByPlaceholder('e.g., Office (Toa Payoh)').fill('Home');
    await page.getByPlaceholder('e.g., Client (Marina Bay)').fill('Office');
    // For selects, since there's Category and then the two extra selects, we can use getByRole
    await page.getByRole('combobox').nth(1).selectOption({ label: 'Client meeting' });
    await page.getByRole('combobox').nth(2).selectOption({ label: 'Morning (06-12)' });

    // 6. Submit the claim
    await page.getByRole('button', { name: /Submit/i }).last().click();

    // 6. Wait for success toast or the claim to appear
    await expect(page.getByText('Claim submitted', { exact: false })).toBeVisible({ timeout: 10000 });
  });
});
