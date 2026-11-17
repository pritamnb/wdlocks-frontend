import { expect, type Page } from '@playwright/test';

/**
 * Shared steps for the Stripe test-mode checkout specs (basket-stripe, basket-payments). They only do anything on a
 * target that shows the "Test mode" banner (staging, stage 1: pretend orders, real Stripe test PaymentIntents); on the
 * demo production site and on live keys `startCheckout` returns false and the spec skips.
 */

export const TEST_PRODUCT = '/products/bruno-teddy-protection-car-key-signal-blocker';
/** £19.99 Bruno + £6.40 Royal Mail 1st Class Signed For, inc VAT. */
export const TEST_TOTAL_PENCE = 2639;
export const CONFIRMED = 'Thank you, your order is confirmed';
export const RETURN_URL = /\/checkout\/return\?order=\d+&key=wc_order_/;

export async function startCheckout(page: Page): Promise<boolean> {
  await page.goto(TEST_PRODUCT);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByRole('dialog')).toContainText('Bruno');
  await page.goto('/checkout');
  // Not networkidle: Stripe.js keeps a connection open, so the page never goes quiet.
  await page.getByLabel('Email').or(page.getByText('Nothing to check out yet')).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  if (!(await page.getByText('Test mode.', { exact: false }).count())) {
    await emptyBasket(page);
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

/** The Payment Element's fields live in the "Secure payment input frame" iframe. */
export function paymentFrame(page: Page) {
  return page.frameLocator('iframe[title="Secure payment input frame"]').first();
}

/** Picks a Payment Element tab (Card, PayPal, …); on narrow screens the rest sit behind a "more" menu. */
export async function chooseMethod(page: Page, name: string) {
  const frame = paymentFrame(page);
  const tab = frame.locator(`button[role="tab"]:has-text("${name}")`).first();
  await frame.locator('button[role="tab"]').first().waitFor({ state: 'visible', timeout: 20_000 });
  if (!(await tab.isVisible().catch(() => false))) {
    await frame.locator('button[aria-haspopup], button[role="tab"][aria-label*="more" i]').last().click();
    await frame.getByRole('option', { name: new RegExp(name, 'i') }).or(frame.locator(`[role="menuitem"]:has-text("${name}")`)).first().click();
  } else {
    await tab.click();
  }
}

export async function fillCard(page: Page, number: string, { expiry = '12 / 30', cvc = '123' } = {}) {
  const frame = paymentFrame(page);
  const numberInput = frame.locator('input[name="number"]').first();
  try {
    await numberInput.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    // Other payment methods shown as tabs: pick Card, then wait again.
    await frame.locator('button[role="tab"]:has-text("Card")').first().click();
    await numberInput.waitFor({ state: 'visible', timeout: 20_000 });
  }
  await numberInput.fill(number);
  await frame.locator('input[name="expiry"]').first().fill(expiry);
  await frame.locator('input[name="cvc"]').first().fill(cvc);
  const postal = frame.locator('input[name="postalCode"]');
  if (await postal.count()) await postal.first().fill('UB6 8RF');
}

export async function acceptTerms(page: Page) {
  const terms = page.getByLabel(/terms and conditions/);
  if (!(await terms.isChecked())) await terms.check();
}

/**
 * Clicks "Place order" and returns the /api/checkout/intent response. Specs set `reducedMotion: 'reduce'`: with the
 * site's smooth scrolling a click on an off-screen button lands mid-scroll and is lost. The click is still repeated
 * when no intent request follows within 20 s.
 */
export async function placeOrder(page: Page) {
  await acceptTerms(page);
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

/**
 * Stripe's 3-D Secure test challenge is an iframe inside an iframe. It appears a few seconds after the intent is
 * created and a click that lands while the modal is still animating is lost, so keep clicking until `done()`.
 */
export async function answerChallenge(page: Page, answer: 'complete' | 'fail', done: () => Promise<boolean>) {
  const selector =
    answer === 'complete'
      ? '#test-source-authorize-3ds, button:has-text("Complete authentication"), button:has-text("Complete")'
      : '#test-source-fail-3ds, button:has-text("Fail authentication"), button:has-text("Fail")';
  const deadline = Date.now() + 60_000;
  let clicks = 0;
  while (Date.now() < deadline && !(await done())) {
    for (const f of page.frames()) {
      const btn = f.locator(selector);
      if (await btn.count().catch(() => 0)) {
        await btn.first().click({ timeout: 2000 }).catch(() => {});
        clicks += 1;
        break;
      }
    }
    await page.waitForTimeout(1500);
  }
  expect(clicks, '3-D Secure challenge button found').toBeGreaterThan(0);
}

/** The error box under the payment step (Next's route announcer is also role=alert, hence the form scope). */
export function payError(page: Page) {
  return page.locator('form [role=alert]');
}

/** A failed payment keeps the shopper on /checkout with the basket intact. */
export async function expectStillOnCheckout(page: Page) {
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('button', { name: /Open basket, 1 item/ })).toBeVisible();
  await expect(page.getByText(CONFIRMED)).toHaveCount(0);
}

export async function emptyBasket(page: Page) {
  await page.goto('/basket');
  const remove = page.getByRole('button', { name: /Remove .* from basket/ });
  for (let i = 0; i < 5 && (await remove.count()); i++) {
    await remove.first().click();
    await page.waitForTimeout(300);
  }
}

/** The return page empties the local basket as soon as the order is confirmed paid. */
export async function expectEmptyBasket(page: Page) {
  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
}
