import { test, expect, type Page } from '@playwright/test';
import { presetConsent } from './consent';

/**
 * Basket flow with the client-held basket (src/lib/basket.ts): add → drawer → /basket → /checkout → remove. Nothing
 * here talks to wdlocks.co.uk: every basket change is a local state update, so the checks assert that the UI responds
 * at once (no network wait, no disabled interval). The "Continue to secure payment" hand-off button is never clicked.
 */
test.describe.configure({ mode: 'serial', retries: 2 });

// The cookie popup is answered up front so it never sits over the basket or checkout controls.
test.beforeEach(({ page }) => presetConsent(page));

const UB6 = { email: 'test@example.com', phone: '02038574718', first: 'Test', last: 'Shopper', line1: '397 Greenford Road', town: 'Greenford', postcode: 'UB6 8RF' };

async function fillAddress(page: Page) {
  await page.getByLabel('Email').fill(UB6.email);
  await page.getByLabel('Phone').fill(UB6.phone);
  await page.getByLabel('First name').fill(UB6.first);
  await page.getByLabel('Last name').fill(UB6.last);
  await page.getByLabel('Address line 1').fill(UB6.line1);
  await page.getByLabel('Town / city').fill(UB6.town);
  await page.getByLabel('Postcode').fill(UB6.postcode);
}

/** Milliseconds between a click and the next DOM change inside `scope`, measured in the page (no Playwright round trip). */
async function clickLatency(page: Page, selector: string, scopeSelector: string): Promise<number> {
  return page.evaluate(
    ([sel, scopeSel]) =>
      new Promise<number>((resolve) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        const scope = document.querySelector(scopeSel) ?? document.body;
        if (!el) return resolve(-1);
        const t0 = performance.now();
        const mo = new MutationObserver(() => {
          mo.disconnect();
          resolve(performance.now() - t0);
        });
        mo.observe(scope, { childList: true, subtree: true, characterData: true, attributes: true });
        el.click();
        setTimeout(() => {
          mo.disconnect();
          resolve(-2);
        }, 5000);
      }),
    [selector, scopeSelector] as const,
  );
}

test('add a cylinder, review it, remove it — every step local and instant', async ({ page }) => {
  await page.goto('/products/3-star-alps-cylinder-door-lock');
  await page.waitForLoadState('networkidle'); // the add handler is attached on hydration; a click during the first paint is lost
  const cartCalls: string[] = [];
  page.on('request', (r) => {
    if (/wdlocks\.co\.uk\/wp-json\/wc\/store\/v1\/cart|\/api\/cart/.test(r.url())) cartCalls.push(r.url());
  });

  const t0 = Date.now();
  await page.getByRole('button', { name: 'Add to basket' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  expect(Date.now() - t0, 'drawer opened without waiting on the store').toBeLessThan(700);
  await expect(drawer).toContainText('Watchdog 3 Star ALPS Cylinder Lock');
  await expect(drawer).toContainText('35 Inside / 35 Outside');
  await expect(drawer.locator('li[aria-busy="true"]')).toHaveCount(0);
  await expect(drawer.getByRole('link', { name: 'Go to checkout' })).toHaveAttribute('href', '/checkout');
  await expect(drawer.getByRole('link', { name: 'Go to checkout' })).not.toHaveAttribute('aria-disabled', 'true');

  // Quantity +/−: the line total changes at once and the controls are never disabled.
  const plus = drawer.getByRole('button', { name: /Increase quantity/ });
  const ms = await clickLatency(page, '[role="dialog"] button[aria-label^="Increase quantity"]', '[role="dialog"]');
  expect(ms, 'quantity + applied in the same frame').toBeGreaterThanOrEqual(0);
  expect(ms).toBeLessThan(200);
  await expect(drawer.getByLabel(/^Quantity of /)).toHaveValue('2');
  await expect(drawer).toContainText('£69.98');
  await expect(plus).toBeEnabled();
  await drawer.getByRole('button', { name: /Decrease quantity/ }).click();
  await expect(drawer.getByLabel(/^Quantity of /)).toHaveValue('1');
  await expect(drawer).toContainText('£34.99');

  await drawer.getByRole('link', { name: 'View basket' }).click();
  await expect(page).toHaveURL(/\/basket$/);
  await expect(page.locator('h1')).toHaveText('Your basket');
  await expect(page.locator('main').getByText('35 Inside / 35 Outside').first()).toBeVisible();
  await page.getByRole('link', { name: 'Proceed to checkout' }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('h1')).toHaveText('Checkout');
  // Hand-off mode shows "Continue to secure payment"; demo/Stripe mode shows the on-site pay button.
  await expect(page.getByRole('button', { name: /Continue to secure payment|^Pay £|Place order/ })).toBeVisible();

  await page.getByRole('button', { name: /Remove .* from basket/ }).click();
  await expect(page.getByText('Nothing to check out yet')).toBeVisible();

  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
  expect(cartCalls, 'no Store API cart call during the basket flow').toEqual([]);
});

test('basket survives a hard reload and is shared with the navbar badge', async ({ page }) => {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByRole('dialog')).toContainText('Bruno');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Open basket, 1 item/ })).toBeVisible();

  const t0 = Date.now();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();
  await expect(page.getByText('Bruno').first()).toBeVisible();
  expect(Date.now() - t0, 'checkout rendered the basket on a hard load without a network wait').toBeLessThan(6000);
  await expect(page.getByRole('button', { name: /Open basket, 1 item/ })).toBeVisible();

  await page.getByRole('button', { name: /Remove .* from basket/ }).click();
  await expect(page.getByText('Nothing to check out yet')).toBeVisible();
  await expect(page.getByRole('button', { name: /Open basket, 0 items/ })).toBeVisible();
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
    await page.getByRole('button', { name: /Remove .* from basket/ }).first().click();
    await expect(page.getByText('Nothing to check out yet')).toBeVisible();
  }
});

test('checkout: delivery options and VAT are local; the total follows the chosen rate; no coupon field', async ({ page }) => {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByRole('dialog')).toContainText('Bruno');
  await page.goto('/checkout?preview=1');
  await expect(page.locator('h1')).toHaveText('Checkout');

  // Rates are known before any address is typed, the cheapest preselected.
  const rates = page.getByRole('radiogroup', { name: 'Delivery method' }).getByRole('radio');
  await expect(rates).toHaveCount(3);
  await expect(rates.nth(0)).toBeChecked();
  const summary = page.locator('aside');
  await expect(summary).toContainText('£19.99'); // Bruno, inc VAT
  await expect(summary).toContainText('£6.40'); // Royal Mail 1st Class Signed For
  await expect(summary).toContainText('£26.39'); // total
  await expect(summary).toContainText('includes £4.40 VAT'); // 3.33 + 1.07

  const ms = await clickLatency(page, 'input[name="shipping_rate"][value="flat_rate:2"]', 'aside');
  expect(ms, 'delivery choice applied at once').toBeGreaterThanOrEqual(0);
  expect(ms).toBeLessThan(200);
  await expect(rates.nth(1)).toBeChecked();
  await expect(summary).toContainText('£10.00');
  await expect(summary).toContainText('£29.99');
  await expect(summary).toContainText('includes £5.00 VAT');

  await expect(page.getByRole('button', { name: 'Got a coupon?' })).toHaveCount(0);
  await expect(page.getByLabel('Coupon code')).toHaveCount(0);

  // The choice is part of the basket: it survives a reload.
  await page.reload();
  await expect(page.getByRole('radiogroup', { name: 'Delivery method' }).getByRole('radio').nth(1)).toBeChecked();
  await page.getByRole('radiogroup', { name: 'Delivery method' }).getByRole('radio').nth(0).check();

  // "Continue to secure payment" is never clicked. Leave the basket empty.
  await page.getByRole('button', { name: /Remove .* from basket/ }).click();
  await expect(page.getByText('Nothing to check out yet')).toBeVisible();
});

test('demo checkout: pay with the 4242 test card and land on the confirmation (demo mode only)', async ({ page }) => {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByRole('dialog')).toContainText('Bruno');
  await page.goto('/checkout');
  // Not networkidle: on Stripe targets Stripe.js keeps a connection open, so the page never goes quiet.
  await page.getByLabel('Email').or(page.getByText('Nothing to check out yet')).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  const demo = page.getByText('Demo payment.', { exact: false });
  if (!(await demo.count())) {
    // Not in demo mode on this target: leave the basket empty and skip.
    await page.goto('/basket');
    await page.getByRole('button', { name: /Remove .* from basket/ }).click();
    test.skip(true, 'NEXT_PUBLIC_CHECKOUT_MODE is not demo on this target');
    return;
  }
  await fillAddress(page);
  await page.getByLabel('Order notes').fill('Leave with the neighbour at number 399, please.');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByLabel('Expiry').fill('1230');
  await page.getByLabel('Security code').fill('123');
  await page.getByLabel('Name on card').fill('Test Shopper');
  await page.getByLabel(/terms and conditions/).check();
  // The intent request carries ids + quantities, the delivery option and the total the shopper saw; the server
  // re-prices from the Store API and must agree (£19.99 + £6.40).
  const intentReq = page.waitForRequest((r) => r.url().includes('/api/checkout/intent') && r.method() === 'POST');
  const intentRes = page.waitForResponse((r) => r.url().includes('/api/checkout/intent'));
  await page.getByRole('button', { name: /^Pay £/ }).click();
  const body = (await intentReq).postDataJSON() as { items: Array<{ id: number; quantity: number }>; shipping_option: string; expected_total: string; customer_note?: string };
  expect(body.items).toEqual([{ id: 5565, quantity: 1 }]);
  expect(body.shipping_option).toBe('rm-signed');
  expect(body.expected_total).toBe('2639');
  expect(body.customer_note).toContain('number 399');
  const res = await intentRes;
  expect(res.status(), await res.text()).toBe(200);
  expect(((await res.json()) as { amount: number }).amount).toBe(2639);

  await expect(page).toHaveURL(/\/checkout\/return\?order=\d+&key=wc_order_demo/, { timeout: 20_000 });
  await expect(page.getByText('Thank you, your order is confirmed')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Order #9\d{5}/)).toBeVisible();
  await expect(page.getByText('£26.39')).toBeVisible();
  // The return page empties the local basket at once.
  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
});
