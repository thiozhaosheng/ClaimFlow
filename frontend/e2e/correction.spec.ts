import { test, expect } from '@playwright/test';

/**
 * An approver can send a claim back without rejecting it: the claim stays
 * Pending, keeps its receipt and its id, and gains a correctionRequest naming
 * the fields that do not match. This suite pins the submitter's side of that
 * loop — the part that replaces the approver messaging the employee to ask
 * for the specific detail.
 *
 * What it holds to:
 *   1. The sent-back claim leads Recent claims and names the exact fields in
 *      human labels, with the approver's note attributed. A flag that says
 *      "details do not match" would leave the chase exactly where it was.
 *   2. The edit modal marks those fields and nothing else, so the work is
 *      obvious without reading the whole form.
 *   3. Saving really PATCHes the claim (the backend clears the request and
 *      tells the approver) and the confirmation says it went back for
 *      approval — not merely that it saved.
 *
 * The API is stubbed at the network boundary so this runs on a CI runner with
 * no backend. The React app and every UI rule under test are real.
 */
test.describe('A claim sent back for correction', () => {
  /** PATCH bodies the app actually sent, so "saved" can be verified, not assumed. */
  let edits: Array<{ url: string; body: any }>;

  test.beforeEach(async ({ page }) => {
    edits = [];

    let signedIn = false;
    let corrected = false;

    const employee = {
      email: 'demo.employee@claimflow.com',
      name: 'Demo Employee',
      role: 'Employee',
    };

    const correctionRequest = {
      fields: ['amount', 'gstAmount'],
      note: 'Receipt total reads S$46.60',
      requestedBy: 'Lim Wei Ming',
      requestedById: 22,
      requestedAt: new Date(Date.now() - 120_000).toISOString(),
    };

    // Two Pending claims. Only the second carries a correction request, and it
    // is listed last — so the test also proves the flagged one is promoted to
    // the top rather than merely rendering wherever the API put it.
    const claims = () => [
      {
        id: 4,
        category: 'Transport',
        amount: 18.5,
        merchant: 'Grab Singapore',
        status: 'Pending',
        receiptUrl: '/test-receipts/real-grab.png',
        expenseDate: new Date(Date.now() - 172_800_000).toISOString(),
        createdAt: new Date(Date.now() - 172_800_000).toISOString(),
      },
      {
        id: 9,
        category: 'Meal',
        amount: 52.4,
        gstAmount: 4.32,
        merchant: 'Toast Box',
        status: 'Pending',
        receiptUrl: '/test-receipts/real-grab.png',
        ocrSource: 'azure',
        expenseDate: new Date(Date.now() - 86_400_000).toISOString(),
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        // Saving the edit clears it on the backend; the stub mirrors that so
        // the flag disappearing is a real consequence, not a repaint.
        details: corrected ? {} : { correctionRequest },
      },
    ];

    const claimList = () => ({
      status: 'success',
      results: 2,
      data: { claims: claims() },
    });

    await page.route('**/api/auth/me', route =>
      signedIn
        ? route.fulfill({ json: { status: 'success', data: { user: employee } } })
        : route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
    );

    await page.route('**/api/auth/login', route => {
      signedIn = true;
      return route.fulfill({ json: { token: 'mock-token', user: employee } });
    });

    // The bell: one changes-requested notification, exactly as the backend
    // writes it.
    await page.route('**/api/notifications/my', route =>
      route.fulfill({
        json: {
          status: 'success',
          data: {
            unread: 1,
            items: [
              {
                id: 501,
                claimId: 9,
                kind: 'changes-requested',
                title: 'Fix Amount, GST on your meal claim',
                body: 'Lim Wei Ming: Receipt total reads S$46.60',
                hint: 'Open the claim, correct those fields and save — it goes straight back for approval.',
                createdAt: new Date(Date.now() - 120_000).toISOString(),
                readAt: null,
              },
            ],
          },
        },
      }),
    );
    await page.route('**/api/notifications/live**', route =>
      route.fulfill({ status: 204, body: '' }),
    );
    // Opening a row marks it read first. Left unstubbed this call reaches the
    // real API, 401s, and the app signs itself out mid-click — which would
    // look like "the notification does not navigate".
    await page.route('**/api/notifications/*/read', route =>
      route.fulfill({ json: { status: 'success' } }),
    );

    await page.route('**/api/claims/9', route => {
      if (route.request().method() === 'PATCH') {
        edits.push({ url: route.request().url(), body: route.request().postDataJSON() });
        corrected = true;
        return route.fulfill({ json: { status: 'success', data: { claim: claims()[1] } } });
      }
      return route.fulfill({ json: claimList() });
    });

    await page.route('**/api/claims/my', route => route.fulfill({ json: claimList() }));
    await page.route('**/api/claims', route => route.fulfill({ json: claimList() }));

    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Submit & track your claims' }),
    ).toBeVisible();
  });

  test('leads Recent claims, naming the fields and quoting the approver', async ({ page }) => {
    // Promoted above the older, unflagged Pending claim.
    // Promoted to the first row of the ledger, and warning-toned there.
    await expect(page.locator('.data-table tbody tr').first()).toHaveClass(
      /claim-row-fix/,
    );

    const row = page.locator('tr.claim-row-fix');
    await expect(row).toHaveCount(1);
    await expect(row.getByText('Correction requested')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Fix and resend' })).toBeVisible();

    // Named above the table as well, so it survives the panel being scrolled.
    await expect(page.locator('.claims-fix-banner')).toContainText('CLM-009');

    // The exact fields, in the labels the form uses — not "some details".
    const note = page.locator('tr.claim-row-fix-note');
    await expect(note.locator('.fix-field')).toHaveText(['Amount', 'GST']);
    await expect(
      note.getByText('Lim Wei Ming: Receipt total reads S$46.60'),
    ).toBeVisible();

    // An ordinary Pending claim is left exactly as it was.
    const plain = page.locator(
      '.data-table tbody tr:not(.claim-row-fix):not(.claim-row-fix-note)',
    );
    await expect(plain.locator('.fix-request')).toHaveCount(0);
    await expect(plain.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('the bell files it under Action needed and states the next step', async ({ page }) => {
    await page.getByRole('button', { name: /unread notifications/ }).click();

    const actionNeeded = page.locator('.notif-section[aria-label="Action needed"]');
    const row = actionNeeded.locator('.notif-row');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveClass(/notif-row-warning/);
    await expect(row).toContainText('Fix Amount, GST on your meal claim');
    await expect(row).toContainText(
      'Open the claim, correct Amount, GST and save — it goes straight back for approval.',
    );

    // Clicking opens the claim, the same as every other kind in the stack.
    await row.click();
    await expect(page).toHaveURL(/\/claim\/CLM-009$/);
  });

  test('the modal marks the requested fields and only those', async ({ page }) => {
    await page.getByRole('button', { name: 'Fix and resend' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Correct this claim' })).toBeVisible();

    // The note appears once, at the top, attributed and naming the fields.
    await expect(
      dialog.getByText('Lim Wei Ming asked for: Amount, GST — Receipt total reads S$46.60'),
    ).toBeVisible();

    // Two fields marked, two tags — Category, Merchant and Expense date stay
    // ordinary so the eye goes to the work.
    await expect(dialog.locator('.field-asked')).toHaveCount(2);
    await expect(dialog.locator('.fix-field-tag')).toHaveCount(2);
    const marked = (await dialog.locator('.field-asked .form-label').allInnerTexts()).join(' | ');
    expect(marked).toContain('Total (S$)');
    expect(marked).toContain('GST (S$)');
    expect(marked).not.toContain('Merchant');
  });

  test('saving sends the correction back and says so', async ({ page }) => {
    await page.getByRole('button', { name: 'Fix and resend' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="number"]').first().fill('46.60');
    await dialog.locator('input[type="number"]').nth(1).fill('3.85');
    await dialog.getByRole('button', { name: 'Save and send back' }).click();

    // The corrected values really went to the API.
    await expect.poll(() => edits.length).toBe(1);
    expect(edits[0].url).toContain('/api/claims/9');
    expect(edits[0].body).toMatchObject({ amount: 46.6, gstAmount: 3.85 });

    // The confirmation says the claim went back for approval — "saved" alone
    // would leave the user wondering whether they still have to chase anyone.
    await expect(page.getByText('Sent back for approval')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(
        'CLM-009 is back with Lim Wei Ming, who will re-check Amount, GST. Nothing else to do.',
      ),
    ).toBeVisible();

    // And the flag is gone, because the request is gone.
    await expect(page.locator('tr.claim-row-fix')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.claims-fix-banner')).toHaveCount(0);
  });
});
