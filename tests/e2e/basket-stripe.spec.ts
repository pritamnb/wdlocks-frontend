import { test, expect } from '@playwright/test';
import { presetConsent } from './consent';
import { answerChallenge, emptyBasket, expectEmptyBasket, fillCard, placeOrder, startCheckout } from './stripe-checkout';

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
// The site scrolls smoothly; Playwright then clicks an off-screen button mid-scroll and the click is lost (the old
// "swallowed first click"). Reduced motion turns smooth scrolling off, as it does for shoppers who ask for it.
test.use({ reducedMotion: 'reduce' });

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
  await answerChallenge(page, 'complete', async () => /\/checkout\/return\?/.test(page.url()));
  await expect(page).toHaveURL(/\/checkout\/return\?order=\d+&key=wc_order_/, { timeout: 40_000 });
  await expect(page.getByText('Thank you, your order is confirmed')).toBeVisible({ timeout: 20_000 });
  await expectEmptyBasket(page);
});
