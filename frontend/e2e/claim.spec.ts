import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Employee Claim Submission', () => {
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

    // The submit button should be disabled because receipt is missing
    const submitBtn = page.getByRole('button', { name: /Submit/i }).last();
    await expect(submitBtn).toBeDisabled();
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

    await page.getByRole('button', { name: /Submit/i }).last().click();

    // The modal should close upon successful submission
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  });
});
