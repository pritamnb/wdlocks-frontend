import { test, expect } from '@playwright/test';

/**
 * Live basket flow: add → drawer → /basket → /checkout review → remove. Runs against the real Store API proxy with a
 * fresh session per test, and leaves the basket empty. The "Continue to secure payment" button is never clicked: it
 * would create a basket on wdlocks.co.uk.
 */
test.describe.configure({ mode: 'serial', retries: 2 });

test('add a cylinder, review it, remove it', async ({ page }) => {
  await page.goto('/products/3-star-alps-cylinder-door-lock');
  await page.waitForLoadState('networkidle'); // the add handler is attached on hydration; a click during the first paint is lost
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/add')), page.getByRole('button', { name: 'Add to basket' }).click()]);

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Watchdog 3 Star ALPS Cylinder Lock');
  await expect(drawer.getByRole('link', { name: 'Go to checkout' })).toHaveAttribute('href', '/checkout');
  await drawer.getByRole('link', { name: 'View basket' }).click();

  await expect(page).toHaveURL(/\/basket$/);
  await expect(page.locator('h1')).toHaveText('Your basket');
  await expect(page.locator('main').getByText('35 Inside / 35 Outside').first()).toBeVisible();
  await page.getByRole('link', { name: 'Proceed to checkout' }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('h1')).toHaveText('Checkout');
  // Hand-off mode shows "Continue to secure payment"; demo/Stripe mode shows the on-site pay button.
  await expect(page.getByRole('button', { name: /Continue to secure payment|^Pay £|Place order/ })).toBeVisible();

  // Wait for the server to confirm the removal before leaving the page, otherwise the navigation aborts it.
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), page.getByRole('button', { name: /Remove .* from basket/ }).click()]);
  await expect(page.getByText('Nothing to check out yet')).toBeVisible();

  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
});

test('buy now: direct wdlocks.co.uk checkout URL in hand-off mode, or our own checkout when payment is on-site', async ({ page }) => {
  await page.goto('/products/3-star-alps-cylinder-door-lock');
  await page.waitForLoadState('networkidle');
  // Intercept the hand-off navigation instead of leaving the site.
  await page.route('https://wdlocks.co.uk/**', (route) => route.fulfill({ status: 200, body: 'intercepted' }));
  const handoff = page.waitForRequest((r) => r.url().startsWith('https://wdlocks.co.uk/checkout/'), { timeout: 20_000 }).then((r) => ({ kind: 'handoff' as const, url: r.url() })).catch(() => null);
  const onsite = page.waitForURL(/\/checkout$/, { timeout: 20_000 }).then(() => ({ kind: 'onsite' as const })).catch(() => null);
  await page.getByRole('button', { name: /Buy now/ }).first().click();
  const result = await Promise.race([handoff, onsite].map((p) => p.then((v) => v ?? new Promise<never>(() => undefined))));
  if (result.kind === 'handoff') {
    const url = new URL(result.url);
    expect(url.searchParams.get('add-to-cart')).toMatch(/^\d+$/);
    expect(url.searchParams.get('quantity')).toBe('1');
    expect(url.searchParams.get('utm_source')).toBe('headless');
  } else {
    // On-site checkout: the lock was added and the shopper lands on /checkout with it in the summary.
    await expect(page.locator('h1')).toHaveText('Checkout');
    await expect(page.getByText('35 Inside / 35 Outside').first()).toBeVisible();
    await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), page.getByRole('button', { name: /Remove .* from basket/ }).first().click()]);
    await expect(page.getByText('Nothing to check out yet')).toBeVisible();
  }
});

test('basket drawer opens instantly with a provisional line, then settles to the server cart', async ({ page }) => {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Add to basket' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  const opened = Date.now() - t0;
  expect(opened, 'drawer opened before the Store API answered').toBeLessThan(700);
  await expect(drawer.locator('li[aria-busy="true"]')).toHaveCount(1);
  await page.waitForResponse((r) => r.url().includes('/api/cart/add'));
  await expect(drawer.locator('li[aria-busy="true"]')).toHaveCount(0);
  await expect(drawer.locator('ul.divide-y > li')).toHaveCount(1);
  await expect(drawer).toContainText('Bruno');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), drawer.getByRole('button', { name: /Remove .* from basket/ }).click()]);
  await expect(drawer.getByText('Your basket is empty')).toBeVisible();
});

test('on-site checkout preview: address saves to the basket, delivery rates and coupon errors come from the Store API', async ({ page }) => {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/add')), page.getByRole('button', { name: 'Add to basket' }).click()]);
  await page.goto('/checkout?preview=1');
  await expect(page.locator('h1')).toHaveText('Checkout');
  await expect(page.getByRole('radiogroup', { name: 'Delivery method' })).toBeVisible();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Phone').fill('02038574718');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address line 1').fill('397 Greenford Road');
  await page.getByLabel('Town / city').fill('Greenford');
  const saved = page.waitForResponse((r) => r.url().includes('/api/cart/customer') && r.status() === 200);
  await page.getByLabel('Postcode').fill('UB6 8RF');
  await saved;
  const rates = page.getByRole('radiogroup', { name: 'Delivery method' }).getByRole('radio');
  expect(await rates.count()).toBeGreaterThanOrEqual(2);
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/shipping') && r.status() === 200), rates.nth(1).check()]);
  await expect(rates.nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Got a coupon?' }).click();
  await page.getByLabel('Coupon code').fill('NOTACODE1');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/coupon')), page.getByRole('button', { name: 'Apply' }).click()]);
  await expect(page.getByText(/coupon code is not valid|not valid|does not exist/i).first()).toBeVisible();
  // "Continue to secure payment" is never clicked. Leave the basket empty.
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), page.getByRole('button', { name: /Remove .* from basket/ }).click()]);
  await expect(page.getByText('Nothing to check out yet')).toBeVisible();
});

test('demo checkout: pay with the 4242 test card and land on the confirmation (demo mode only)', async ({ page }) => {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/add')), page.getByRole('button', { name: 'Add to basket' }).click()]);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  const demo = page.getByText('Demo payment.', { exact: false });
  if (!(await demo.count())) {
    // Not in demo mode on this target: leave the basket empty and skip.
    await page.goto('/basket');
    await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), page.getByRole('button', { name: /Remove .* from basket/ }).click()]);
    test.skip(true, 'NEXT_PUBLIC_CHECKOUT_MODE is not demo on this target');
    return;
  }
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Phone').fill('02038574718');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address line 1').fill('397 Greenford Road');
  await page.getByLabel('Town / city').fill('Greenford');
  const saved = page.waitForResponse((r) => r.url().includes('/api/cart/customer') && r.status() === 200);
  await page.getByLabel('Postcode').fill('UB6 8RF');
  await saved;
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByLabel('Expiry').fill('1230');
  await page.getByLabel('Security code').fill('123');
  await page.getByLabel('Name on card').fill('Test Shopper');
  await page.getByLabel(/terms and conditions/).check();
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/checkout/demo')), page.getByRole('button', { name: /^Pay £/ }).click()]);
  await expect(page).toHaveURL(/\/checkout\/return\?order=\d+&key=wc_order_demo/);
  await expect(page.getByText('Thank you, your order is confirmed')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Order #9\d{5}/)).toBeVisible();
  // The basket was emptied by the return page, which fires the clear without awaiting it; the Store API takes ~2 s a
  // call on shared hosting, so give it a moment before leaving (as the Stripe spec does) and allow a slow reply.
  await page.waitForTimeout(3000);
  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible({ timeout: 30_000 });
});
