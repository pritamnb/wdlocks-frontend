import { test, expect, type Page } from '@playwright/test';

/**
 * Payments rollout stage 1 (docs/stripe-checkout-plan.md §5): on a target with Stripe TEST keys the checkout shows the
 * real Payment Element. These tests pay with Stripe's test cards; nothing is ever charged. They skip on targets without
 * the "Test mode" banner (production runs the demo provider, and live keys must never be driven by a test).
 */

async function startCheckout(page: Page): Promise<boolean> {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/add')), page.getByRole('button', { name: 'Add to basket' }).click()]);
  await page.goto('/checkout');
  // Not networkidle: Stripe.js keeps a connection open, so the page never goes quiet.
  await page.getByLabel('Email').or(page.getByText('Nothing to check out yet')).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  if (!(await page.getByText('Test mode.', { exact: false }).count())) {
    await page.goto('/basket');
    await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), page.getByRole('button', { name: /Remove .* from basket/ }).click()]);
    return false;
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

async function placeOrder(page: Page) {
  await page.getByLabel(/terms and conditions/).check();
  await page.getByRole('button', { name: 'Place order' }).click();
}

async function emptyBasket(page: Page) {
  await page.goto('/basket');
  const remove = page.getByRole('button', { name: /Remove .* from basket/ });
  if (await remove.count()) await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), remove.first().click()]);
}

test('stripe test mode: 4242 succeeds and lands on the confirmation', async ({ page }) => {
  if (!(await startCheckout(page))) return test.skip(true, 'No Stripe test-mode checkout on this target');
  await fillCard(page, '4242424242424242');
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/checkout/intent') && r.status() === 200), placeOrder(page)]);
  await expect(page).toHaveURL(/\/checkout\/return\?order=\d+&key=wc_order_demo/, { timeout: 30_000 });
  await expect(page.getByText('Thank you, your order is confirmed')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Order #9\d{5}/)).toBeVisible();
  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
});

test('stripe test mode: 4000 0000 0000 0002 is declined with a message, basket kept', async ({ page }) => {
  if (!(await startCheckout(page))) return test.skip(true, 'No Stripe test-mode checkout on this target');
  await fillCard(page, '4000000000000002');
  await placeOrder(page);
  await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/checkout$/);
  await emptyBasket(page);
});

test('stripe test mode: 4000 0025 0000 3155 asks for 3-D Secure; completing it confirms the order', async ({ page }) => {
  if (!(await startCheckout(page))) return test.skip(true, 'No Stripe test-mode checkout on this target');
  await fillCard(page, '4000002500003155');
  await placeOrder(page);
  // Stripe's test challenge is an iframe inside an iframe with a "Complete" button.
  const deadline = Date.now() + 40_000;
  let completed = false;
  while (Date.now() < deadline && !completed) {
    for (const f of page.frames()) {
      const btn = f.locator('#test-source-authorize-3ds, button:has-text("Complete authentication"), button:has-text("Complete")');
      if (await btn.count().catch(() => 0)) {
        await btn.first().click().catch(() => {});
        completed = true;
        break;
      }
    }
    if (!completed) await page.waitForTimeout(1000);
  }
  expect(completed, '3-D Secure challenge button found').toBe(true);
  await expect(page).toHaveURL(/\/checkout\/return\?order=\d+&key=wc_order_demo/, { timeout: 40_000 });
  await expect(page.getByText('Thank you, your order is confirmed')).toBeVisible({ timeout: 20_000 });
  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
});
