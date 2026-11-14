import { test, expect, type Page } from '@playwright/test';
import { presetConsent } from './consent';

/**
 * Payments rollout stage 1 (docs/stripe-checkout-plan.md §5): on a target with Stripe TEST keys the checkout shows the
 * real Payment Element. These tests pay with Stripe's test cards; nothing is ever charged. They skip on targets without
 * the "Test mode" banner (production runs the demo provider, and live keys must never be driven by a test).
 * Stage 1 (no WooCommerce key): pretend orders `wc_order_demo…` / #9xxxxx. Stage 2: real WooCommerce orders, which must be
 * cancelled afterwards (they are paid with test cards, no stock moves).
 * The basket is client-held: the only call to the store is POST /api/checkout/intent at "Place order".
 */
// The cookie popup is answered up front so it never sits over the basket or checkout controls.
test.beforeEach(({ page }) => presetConsent(page));

async function startCheckout(page: Page): Promise<boolean> {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByRole('dialog')).toContainText('Bruno');
  await page.goto('/checkout');
  // Not networkidle: Stripe.js keeps a connection open, so the page never goes quiet.
  await page.getByLabel('Email').or(page.getByText('Nothing to check out yet')).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  if (!(await page.getByText('Test mode.', { exact: false }).count())) {
    await page.goto('/basket');
    await page.getByRole('button', { name: /Remove .* from basket/ }).click();
    return false;
  }
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Phone').fill('02038574718');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address line 1').fill('397 Greenford Road');
  await page.getByLabel('Town / city').fill('Greenford');
  await page.getByLabel('Postcode').fill('UB6 8RF');
  await page.getByLabel('Order notes').fill('Test order from the e2e suite — safe to cancel.');
  return true;
}

/** Fills Stripe's Payment Element (its fields live in the "Secure payment input frame" iframe). */
async function fillCard(page: Page, number: string) {
  const frame = page.frameLocator('iframe[title="Secure payment input frame"]').first();
  const numberInput = frame.locator('input[name="number"]').first();
  try {
    await numberInput.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    // Other payment methods shown as tabs: pick Card, then wait again.
    await frame.locator('button[role="tab"]:has-text("Card")').first().click();
    await numberInput.waitFor({ state: 'visible', timeout: 20_000 });
  }
  await numberInput.fill(number);
  await frame.locator('input[name="expiry"]').first().fill('12 / 30');
  await frame.locator('input[name="cvc"]').first().fill('123');
  const postal = frame.locator('input[name="postalCode"]');
  if (await postal.count()) await postal.first().fill('UB6 8RF');
}

/**
 * Clicks "Place order" and returns the /api/checkout/intent response. Stripe's Payment Element occasionally swallows the
 * first click while its Link overlay settles (seen once in three runs, before and after the basket rewrite), so the
 * click is repeated when no intent request follows within 20 s.
 */
async function placeOrder(page: Page) {
  await page.getByLabel(/terms and conditions/).check();
  const button = page.getByRole('button', { name: 'Place order' });
  for (let attempt = 0; attempt < 3; attempt++) {
    const pending = page.waitForResponse((r) => r.url().includes('/api/checkout/intent'), { timeout: 20_000 }).catch(() => null);
    await button.click();
    const res = await pending;
    if (res) return res;
    if (/\/checkout\/return\?/.test(page.url())) return null;
  }
  throw new Error('"Place order" produced no /api/checkout/intent request after three clicks');
}

/** The return page empties the local basket as soon as the order is confirmed paid. */
async function expectEmptyBasket(page: Page) {
  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
}

async function emptyBasket(page: Page) {
  await page.goto('/basket');
  const remove = page.getByRole('button', { name: /Remove .* from basket/ });
  if (await remove.count()) await remove.first().click();
}

test('stripe test mode: 4242 succeeds and lands on the confirmation', async ({ page }) => {
  test.slow(); // the intent prices the basket from the Store API and may create a WooCommerce order: 5–20 s
  if (!(await startCheckout(page))) return test.skip(true, 'No Stripe test-mode checkout on this target');
  await fillCard(page, '4242424242424242');
  const res = await placeOrder(page);
  expect(res, 'intent response').not.toBeNull();
  expect(res!.status(), await res!.text()).toBe(200);
  expect(((await res!.json()) as { amount: number }).amount).toBe(2639); // £19.99 Bruno + £6.40 Royal Mail, inc VAT
  await expect(page).toHaveURL(/\/checkout\/return\?order=\d+&key=wc_order_/, { timeout: 30_000 });
  await expect(page.getByText('Thank you, your order is confirmed')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Order #\d{3,}/)).toBeVisible();
  await expect(page.getByText('£26.39')).toBeVisible();
  await expectEmptyBasket(page);
});

test('stripe test mode: 4000 0000 0000 0002 is declined with a message, basket kept', async ({ page }) => {
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, 'No Stripe test-mode checkout on this target');
  await fillCard(page, '4000000000000002');
  await placeOrder(page);
  await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('button', { name: /Open basket, 1 item/ })).toBeVisible();
  await emptyBasket(page);
});

test('stripe test mode: 4000 0025 0000 3155 asks for 3-D Secure; completing it confirms the order', async ({ page }) => {
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, 'No Stripe test-mode checkout on this target');
  await fillCard(page, '4000002500003155');
  await placeOrder(page);
  // Stripe's test challenge is an iframe inside an iframe with a "Complete" button. It appears a few seconds after the
  // order and intent are created (longer with a real WooCommerce order), and a click that lands while the modal is still
  // animating is lost, so keep clicking until the return page shows up.
  const deadline = Date.now() + 60_000;
  let clicks = 0;
  while (Date.now() < deadline && !/\/checkout\/return\?/.test(page.url())) {
    for (const f of page.frames()) {
      const btn = f.locator('#test-source-authorize-3ds, button:has-text("Complete authentication"), button:has-text("Complete")');
      if (await btn.count().catch(() => 0)) {
        await btn.first().click({ timeout: 2000 }).catch(() => {});
        clicks += 1;
        break;
      }
    }
    await page.waitForTimeout(1500);
  }
  expect(clicks, '3-D Secure challenge button found').toBeGreaterThan(0);
  await expect(page).toHaveURL(/\/checkout\/return\?order=\d+&key=wc_order_/, { timeout: 40_000 });
  await expect(page.getByText('Thank you, your order is confirmed')).toBeVisible({ timeout: 20_000 });
  await expectEmptyBasket(page);
});
