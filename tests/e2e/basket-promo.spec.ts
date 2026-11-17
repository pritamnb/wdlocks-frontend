import { test, expect, type Page } from '@playwright/test';
import { presetConsent } from './consent';
import { CONFIRMED, RETURN_URL, emptyBasket, expectEmptyBasket, fillCard, placeOrder } from './stripe-checkout';

/**
 * Promo codes, end to end, with the example codes of the test checkouts (src/lib/example-coupons.ts): the shop itself
 * has no coupons. Runs on the demo checkout (Vercel production, a local demo build) and on Stripe test mode (staging);
 * skips anywhere else, so live keys and real orders are never involved.
 *   Bruno £19.99 + Royal Mail 1st Class Signed For £6.40 = £26.39.
 */
test.beforeEach(({ page }) => presetConsent(page));
test.use({ reducedMotion: 'reduce' });

type Mode = 'stripe' | 'demo';

async function openCheckout(page: Page): Promise<Mode | null> {
  await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByRole('dialog')).toContainText('Bruno');
  await page.goto('/checkout');
  await page.getByLabel('Email').or(page.getByText('Nothing to check out yet')).first().waitFor({ timeout: 30_000 });
  // The payment step loads after the page: wait for whichever this target shows.
  await expect(page.getByText('Test mode.', { exact: false }).or(page.getByText('Demo payment.', { exact: false })).or(page.getByRole('button', { name: 'Continue to secure payment' })).first()).toBeVisible({ timeout: 20_000 });
  const mode: Mode | null = (await page.getByText('Test mode.', { exact: false }).count()) ? 'stripe' : (await page.getByText('Demo payment.', { exact: false }).count()) ? 'demo' : null;
  if (!mode) await emptyBasket(page);
  return mode;
}

const promoInput = (page: Page) => page.locator('section[aria-labelledby="co-payment"]').getByLabel(/Promo code/);
const summary = (page: Page) => page.locator('aside');

async function applyCode(page: Page, code: string) {
  await promoInput(page).fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

async function fillContactAndAddress(page: Page) {
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Phone').fill('02038574718');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address line 1').fill('397 Greenford Road');
  await page.getByLabel('Town / city').fill('Greenford');
  await page.getByLabel('Postcode').fill('UB6 8RF');
}

test('EXAMPLE10 takes 10 % off the items, Remove puts the total back', async ({ page }) => {
  const mode = await openCheckout(page);
  test.skip(!mode, 'no demo or Stripe test-mode checkout on this target');
  await applyCode(page, 'example10');
  await expect(page.getByText(/EXAMPLE10\s*applied · you save £2\.00/i)).toBeVisible({ timeout: 20_000 });
  await expect(summary(page)).toContainText('−£2.00');
  await expect(summary(page)).toContainText('£24.39');
  await expect(summary(page)).toContainText('includes £4.07 VAT'); // 4.40 − 0.33 on the £2.00 discount

  await page.locator('section[aria-labelledby="co-payment"]').getByRole('button', { name: 'Remove' }).click();
  await expect(summary(page)).toContainText('£26.39');
  await expect(summary(page)).not.toContainText('−£');
  await emptyBasket(page);
});

test('EXAMPLE5 takes £5 off', async ({ page }) => {
  const mode = await openCheckout(page);
  test.skip(!mode, 'no demo or Stripe test-mode checkout on this target');
  await applyCode(page, 'EXAMPLE5');
  await expect(page.getByText(/you save £5\.00/)).toBeVisible({ timeout: 20_000 });
  await expect(summary(page)).toContainText('£21.39');
  await emptyBasket(page);
});

test('EXAMPLE50 is refused under £50 with WooCommerce\'s reason, and applies once the basket reaches it', async ({ page }) => {
  const mode = await openCheckout(page);
  test.skip(!mode, 'no demo or Stripe test-mode checkout on this target');
  await applyCode(page, 'example50');
  await expect(page.locator('#co-promo-error')).toHaveText('The minimum spend for this coupon is £50.00.', { timeout: 20_000 });
  await expect(summary(page)).toContainText('£26.39');

  // Three Brunos: £59.97.
  const more = summary(page).getByRole('button', { name: /Increase quantity of Bruno/ });
  await more.click();
  await more.click();
  await expect(summary(page)).toContainText('£59.97');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText(/you save £10\.00/)).toBeVisible({ timeout: 20_000 });
  await expect(summary(page)).toContainText('£56.37'); // 59.97 + 6.40 − 10.00
  await emptyBasket(page);
});

test('EXAMPLEOLD is refused as expired; an unknown code is refused as not existing', async ({ page }) => {
  const mode = await openCheckout(page);
  test.skip(!mode, 'no demo or Stripe test-mode checkout on this target');
  await applyCode(page, 'exampleold');
  await expect(page.locator('#co-promo-error')).toHaveText('This coupon has expired.', { timeout: 20_000 });
  await applyCode(page, 'no-such-code-e2e');
  await expect(page.locator('#co-promo-error')).toContainText(/does not exist/i, { timeout: 25_000 });
  await expect(summary(page)).toContainText('£26.39');
  await emptyBasket(page);
});

test('paying with EXAMPLE10: the order goes through at £24.39', async ({ page }) => {
  test.slow();
  const mode = await openCheckout(page);
  test.skip(!mode, 'no demo or Stripe test-mode checkout on this target');
  await fillContactAndAddress(page);
  await applyCode(page, 'EXAMPLE10');
  await expect(page.getByText(/you save £2\.00/)).toBeVisible({ timeout: 20_000 });

  let res;
  if (mode === 'stripe') {
    await fillCard(page, '4242424242424242');
    res = await placeOrder(page);
  } else {
    await page.getByLabel('Card number').fill('4242424242424242');
    await page.getByLabel('Expiry').fill('1230');
    await page.getByLabel('Security code').fill('123');
    await page.getByLabel('Name on card').fill('Test Shopper');
    await page.getByLabel(/terms and conditions/).check();
    const pending = page.waitForResponse((r) => r.url().includes('/api/checkout/intent'));
    await page.getByRole('button', { name: /^Pay £24\.39/ }).click();
    res = await pending;
  }
  const sent = res!.request().postDataJSON() as { coupon_code?: string; expected_total: string };
  expect(sent.coupon_code).toBe('example10');
  expect(sent.expected_total).toBe('2439');
  expect(res!.status(), await res!.text()).toBe(200);
  expect(((await res!.json()) as { amount: number }).amount).toBe(2439);

  await expect(page).toHaveURL(RETURN_URL, { timeout: 30_000 });
  await expect(page.getByText(CONFIRMED)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('£24.39')).toBeVisible();
  await expectEmptyBasket(page);
});
