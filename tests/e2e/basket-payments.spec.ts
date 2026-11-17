import { test, expect, type Page, type Request } from '@playwright/test';
import { presetConsent } from './consent';
import {
  CONFIRMED,
  RETURN_URL,
  TEST_TOTAL_PENCE,
  acceptTerms,
  answerChallenge,
  chooseMethod,
  emptyBasket,
  expectEmptyBasket,
  expectStillOnCheckout,
  fillCard,
  payError,
  placeOrder,
  startCheckout,
} from './stripe-checkout';

/**
 * Payment scenarios beyond the happy path, on Stripe TEST keys only (staging, stage 1: pretend orders, nothing charged).
 * Every test skips on a target without the "Test mode" banner, so the demo production site and live keys are never
 * driven. Run against staging:
 *   E2E_BASE_URL=https://wdlocks-frontend-staging.vercel.app npx playwright test basket-payments --project=basket-desktop --no-deps
 * Not covered here (need a person or stage 2): Apple Pay / Google Pay on a real phone, Klarna's own test flow, the
 * webhook marking a real WooCommerce order paid, refunds.
 */
test.beforeEach(({ page }) => presetConsent(page));
// The site scrolls smoothly; Playwright then clicks an off-screen button mid-scroll and the click is lost (the old
// "swallowed first click"). Reduced motion turns smooth scrolling off, as it does for shoppers who ask for it.
test.use({ reducedMotion: 'reduce' });

const NO_STRIPE = 'No Stripe test-mode checkout on this target';

/** Stripe's test cards that fail at confirmation, and the message Stripe gives the shopper. */
const DECLINES = [
  { card: '4000000000009995', what: 'insufficient funds', message: /insufficient funds/i },
  { card: '4000000000000069', what: 'expired card', message: /expired/i },
  { card: '4000000000000127', what: 'wrong security code', message: /security code is incorrect|incorrect/i },
  { card: '4000000000000119', what: 'processing error', message: /error occurred while processing|processing/i },
  { card: '4100000000000019', what: 'blocked as fraud (Radar)', message: /declined/i },
];

test.describe('declined cards', () => {
  // The decline path is the same at every width; one browser keeps the run short.
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  for (const d of DECLINES) {
    test(`${d.card}: ${d.what} shows Stripe's message and keeps the basket`, async ({ page }) => {
      test.slow();
      if (!(await startCheckout(page))) return test.skip(true, NO_STRIPE);
      await fillCard(page, d.card);
      const res = await placeOrder(page);
      expect(res?.status()).toBe(200);
      await expect(payError(page)).toContainText(d.message, { timeout: 30_000 });
      await expectStillOnCheckout(page);
      await emptyBasket(page);
    });
  }
});

test('3-D Secure failed: message, basket kept, then 4242 pays on the next try', async ({ page }) => {
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, NO_STRIPE);
  await fillCard(page, '4000002500003155');
  await placeOrder(page);
  await answerChallenge(page, 'fail', async () => (await payError(page).count()) > 0);
  await expect(payError(page)).toContainText(/unable to authenticate|authenticat/i, { timeout: 20_000 });
  await expectStillOnCheckout(page);

  await fillCard(page, '4242424242424242');
  const res = await placeOrder(page);
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(RETURN_URL, { timeout: 30_000 });
  await expect(page.getByText(CONFIRMED)).toBeVisible({ timeout: 20_000 });
  await expectEmptyBasket(page);
});

/** Stripe's test redirect page for PayPal and other redirect methods. */
async function answerRedirect(page: Page, answer: 'authorize' | 'fail') {
  const button = page.getByRole('link', { name: answer === 'authorize' ? /authori[sz]e test payment/i : /fail test payment/i })
    .or(page.getByRole('button', { name: answer === 'authorize' ? /authori[sz]e test payment/i : /fail test payment/i }));
  await button.first().click({ timeout: 30_000 });
}

test('PayPal authorised on the test page lands on the confirmation', async ({ page }) => {
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, NO_STRIPE);
  await chooseMethod(page, 'PayPal');
  const res = await placeOrder(page);
  expect(res?.status()).toBe(200);
  await answerRedirect(page, 'authorize');
  await expect(page).toHaveURL(/\/checkout\/return\?.*redirect_status=succeeded/, { timeout: 30_000 });
  await expect(page.getByText(CONFIRMED)).toBeVisible({ timeout: 25_000 });
  await expectEmptyBasket(page);
});

test('PayPal failed on the test page: "didn\'t go through", back to checkout with the basket', async ({ page }) => {
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, NO_STRIPE);
  await chooseMethod(page, 'PayPal');
  const res = await placeOrder(page);
  expect(res?.status()).toBe(200);
  await answerRedirect(page, 'fail');
  await expect(page).toHaveURL(/\/checkout\/return\?.*redirect_status=failed/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /Payment didn.t go through/ })).toBeVisible({ timeout: 25_000 });
  await page.getByRole('link', { name: 'Back to checkout' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('button', { name: /Open basket, 1 item/ })).toBeVisible();
  await emptyBasket(page);
});

test('double press of Place order makes one payment; the confirmation survives a reload', async ({ page }) => {
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, NO_STRIPE);
  await fillCard(page, '4242424242424242');
  await acceptTerms(page);
  // Let Stripe's Link "save my information" box settle so the button stops moving.
  await page.waitForTimeout(2000);
  const intents: Request[] = [];
  page.on('request', (r) => { if (r.url().includes('/api/checkout/intent') && r.method() === 'POST') intents.push(r); });
  await page.getByRole('button', { name: 'Place order' }).dblclick();
  await expect(page).toHaveURL(RETURN_URL, { timeout: 40_000 });
  expect(intents.length, 'intent requests').toBe(1);
  await expect(page.getByText(CONFIRMED)).toBeVisible({ timeout: 20_000 });
  const orderLine = await page.getByText(/Order #\d+/).first().innerText();
  await page.reload();
  await expect(page.getByText(CONFIRMED)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Order #\d+/).first()).toHaveText(orderLine);
  await expectEmptyBasket(page);
});

test('price changed since the basket was priced: the shopper is told, then pays the store price', async ({ page }) => {
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, NO_STRIPE);
  await fillCard(page, '4242424242424242');
  // The first order request claims the shopper saw £1 less than the store price, as if the price rose meanwhile.
  let tampered = false;
  await page.route('**/api/checkout/intent', async (route) => {
    if (tampered) return route.continue();
    tampered = true;
    const body = JSON.parse(route.request().postData() ?? '{}');
    await route.continue({ postData: JSON.stringify({ ...body, expected_total: String(Number(body.expected_total) - 100) }) });
  });
  const first = await placeOrder(page);
  expect(first?.status()).toBe(409);
  await expect(page.getByText('Prices were updated from the store. Please check the total and try again.')).toBeVisible();
  await expectStillOnCheckout(page);

  const second = await placeOrder(page);
  expect(second?.status()).toBe(200);
  expect(((await second!.json()) as { amount: number }).amount).toBe(TEST_TOTAL_PENCE);
  await expect(page).toHaveURL(RETURN_URL, { timeout: 30_000 });
  await expect(page.getByText(CONFIRMED)).toBeVisible({ timeout: 20_000 });
  await expectEmptyBasket(page);
});

test('every delivery option: the amount Stripe is asked for equals the total on screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  test.slow();
  if (!(await startCheckout(page))) return test.skip(true, NO_STRIPE);
  await fillCard(page, '4242424242424242');
  // Each order request reaches the server for real (a test PaymentIntent, never confirmed); the browser then gets an
  // error instead of the client secret, so nothing is paid.
  const seen: Array<{ expected: number; amount: number }> = [];
  await page.route('**/api/checkout/intent', async (route) => {
    const sent = JSON.parse(route.request().postData() ?? '{}');
    const res = await route.fetch();
    const json = (await res.json()) as { amount?: number };
    seen.push({ expected: Number(sent.expected_total), amount: Number(json.amount) });
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'e2e_stop', message: 'Stopped by the e2e test before payment.' }) });
  });

  const radios = page.getByRole('radiogroup', { name: 'Delivery method' }).getByRole('radio');
  const count = await radios.count();
  expect(count, 'delivery options').toBeGreaterThan(1);
  const totalCell = page.locator('dl div:has(> dt:text-is("Total")) dd span').first();
  for (let i = 0; i < count; i++) {
    await radios.nth(i).check();
    await expect(page.getByRole('radiogroup', { name: 'Delivery method' })).toHaveAttribute('aria-busy', 'false');
    await page.waitForTimeout(300);
    const shown = Math.round(Number((await totalCell.innerText()).replace(/[^\d.]/g, '')) * 100);
    await placeOrder(page);
    await expect(payError(page)).toContainText('Stopped by the e2e test');
    const last = seen.at(-1)!;
    expect(last.amount, `option ${i + 1}: server amount`).toBe(last.expected);
    expect(last.amount, `option ${i + 1}: total on screen`).toBe(shown);
  }
  expect(new Set(seen.map((s) => s.amount)).size, 'options change the total').toBeGreaterThan(1);
  await page.unroute('**/api/checkout/intent');
  await emptyBasket(page);
});
