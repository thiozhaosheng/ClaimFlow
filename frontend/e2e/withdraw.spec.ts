import { test, expect } from '@playwright/test';

/**
 * Withdrawing a claim is irreversible from the employee's side, so it is
 * gated behind a confirmation. This suite pins two things about that gate:
 *
 *   1. It is the application's own dialog, not window.confirm(). The native
 *      dialog cannot be styled, so its confirm button is painted the same
 *      neutral colour as any ordinary action and the destructive path carries
 *      no visual warning at all.
 *   2. Dismissing it does not withdraw anything. A confirmation that fires the
 *      request anyway is worse than no confirmation, because it reads as a
 *      safety net that is not there.
 *
 * The API is stubbed at the network boundary, so this runs on a CI runner with
 * no backend or database. The React app and every UI rule under test are real.
 */
test.describe('Withdrawing a claim', () => {
  /** Set by the PATCH stub when the app actually asks to withdraw. */
  let withdrawRequests: string[];
  /** Any native dialog Playwright had to dismiss — must stay empty. */
  let nativeDialogs: string[];

  test.beforeEach(async ({ page }) => {
    withdrawRequests = [];
    nativeDialogs = [];

    let signedIn = false;

    const employee = {
      email: 'demo.employee@claimflow.com',
      name: 'Demo Employee',
      role: 'Employee',
    };

    // One Pending claim: the Edit/Withdraw row only renders for that status.
    const pendingClaim = {
      id: 7,
      category: 'Transport',
      amount: 18.5,
      merchant: 'Grab Singapore',
      status: 'Pending',
      receiptUrl: '/test-receipts/real-grab.png',
      ocrSource: 'azure',
      expenseDate: new Date(Date.now() - 86_400_000).toISOString(),
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    };

    const claimList = () => ({
      status: 'success',
      results: 1,
      data: { claims: [pendingClaim] },
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

    await page.route('**/api/notifications/my', route =>
      route.fulfill({ json: { status: 'success', results: 0, data: { notifications: [] } } }),
    );

    // Ordered before the generic **/api/claims route: Playwright matches the
    // most recently registered handler first, but keeping the specific one
    // separate makes the intent obvious rather than order-dependent.
    await page.route('**/api/claims/*/withdraw', route => {
      withdrawRequests.push(route.request().url());
      return route.fulfill({ json: { status: 'success', data: { claim: pendingClaim } } });
    });

    await page.route('**/api/claims/my', route => route.fulfill({ json: claimList() }));
    await page.route('**/api/claims', route => route.fulfill({ json: claimList() }));

    // If the app ever falls back to window.confirm(), Playwright auto-dismisses
    // it and the click silently does nothing — which would otherwise look like
    // a passing test. Recording them makes that failure visible.
    page.on('dialog', async dialog => {
      nativeDialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Sign in as Employee/i }).click();
    await expect(page.getByRole('heading', { name: 'Submit & track your claims' })).toBeVisible();
  });

  test('asks for confirmation in the app, not a native browser dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Withdraw' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Withdraw this claim?' })).toBeVisible();

    // The confirming button names the action rather than saying "OK", so it
    // reads correctly even when the red is not perceived.
    await expect(dialog.getByRole('button', { name: 'Withdraw claim' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Keep claim' })).toBeVisible();

    expect(nativeDialogs).toEqual([]);
    // Merely opening the dialog must not have withdrawn anything.
    expect(withdrawRequests).toEqual([]);
  });

  test('the destructive button is red, and the safe one is not', async ({ page }) => {
    await page.getByRole('button', { name: 'Withdraw' }).click();

    const dialog = page.getByRole('dialog');
    const confirm = dialog.getByRole('button', { name: 'Withdraw claim' });
    const cancel = dialog.getByRole('button', { name: 'Keep claim' });

    const colourOf = (locator: ReturnType<typeof dialog.getByRole>) =>
      locator.evaluate(el => getComputedStyle(el).backgroundColor);

    const [confirmBg, cancelBg] = await Promise.all([colourOf(confirm), colourOf(cancel)]);

    // Parsed rather than string-matched, so a change of red shade does not
    // break the test while a change of hue does.
    const rgb = (value: string) => value.match(/\d+/g)!.slice(0, 3).map(Number);
    const [r, g, b] = rgb(confirmBg);

    expect(r).toBeGreaterThan(120);
    expect(r).toBeGreaterThan(g * 1.5);
    expect(r).toBeGreaterThan(b * 1.5);
    expect(cancelBg).not.toBe(confirmBg);
  });

  test('dismissing it withdraws nothing', async ({ page }) => {
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await page.getByRole('button', { name: 'Keep claim' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(withdrawRequests).toEqual([]);

    // The claim is still listed and still actionable.
    await expect(page.getByRole('button', { name: 'Withdraw' })).toBeVisible();
  });

  test('confirming it sends the withdraw request', async ({ page }) => {
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await page.getByRole('button', { name: 'Withdraw claim' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Claim withdrawn')).toBeVisible({ timeout: 10000 });

    expect(withdrawRequests).toHaveLength(1);
    // The raw numeric id from the API, not the display id CLM-007.
    expect(withdrawRequests[0]).toContain('/api/claims/7/withdraw');
    expect(nativeDialogs).toEqual([]);
  });
});
