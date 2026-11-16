import { test, expect } from '@playwright/test';
import { presetConsent } from './consent';

/**
 * Checkout form checks from the 16 Nov manual test run. Pay is only ever pressed with something missing, so no order
 * or payment is created on any site. (Demo checkout only: the Stripe Payment Element is a cross-origin iframe.)
 *   - one press of Pay flags every problem at once (it used to flag the card fields, then the address on a 2nd press);
 *   - the message names the missing fields instead of only the terms, and the first error is focused;
 *   - inputs are 16 px on phones so iOS Safari does not zoom in on focus.
 */
test.beforeEach(({ page }) => presetConsent(page));

async function toCheckout(page: import('@playwright/test').Page) {
  await page.goto('/products/3-star-alps-cylinder-door-lock');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Go to checkout' })).toBeVisible();
  await page.goto('/checkout');
  await expect(page.locator('h1')).toHaveText('Checkout');
}

test('one press of Pay flags every missing field and focuses the first', async ({ page }) => {
  await toCheckout(page);
  // The payment step loads after the page (dynamic import); wait for whichever button this deployment shows.
  await expect(page.getByRole('button', { name: /^Pay £|Continue to secure payment/ }).or(page.locator('iframe[name^="__privateStripeFrame"]')).first()).toBeVisible();
  const pay = page.getByRole('button', { name: /^Pay £/ });
  test.skip(!(await pay.count()), 'demo checkout only');
  const orderCalls: string[] = [];
  page.on('request', (r) => { if (/\/api\/checkout\/(intent|demo)/.test(r.url())) orderCalls.push(r.url()); });

  await pay.click();
  for (const id of ['co-email', 'co-phone', 'ship-first_name', 'ship-last_name', 'ship-address_1', 'ship-city', 'ship-postcode', 'demo-card', 'demo-exp', 'demo-cvc', 'demo-name']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(page.getByRole('checkbox', { name: /terms/i })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('form [role=alert]')).toContainText('Please complete the highlighted fields and accept the terms and conditions.');
  await expect(page.locator('#co-email')).toBeFocused();
  await expect(page.locator('#co-email')).toBeInViewport();
  expect(orderCalls).toEqual([]);

  // Everything but the card: the card message, and the card number is focused.
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Phone').fill('02038574718');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address line 1').fill('397 Greenford Road');
  await page.getByLabel('Town / city').fill('Greenford');
  await page.getByLabel('Postcode').fill('UB6 8RF');
  await page.getByRole('checkbox', { name: /terms/i }).check();
  await pay.click();
  await expect(page.locator('form [role=alert]')).toContainText('Check the card details');
  await expect(page.locator('#demo-card')).toBeFocused();
  expect(orderCalls).toEqual([]);
});

test('checkout and basket inputs are 16 px on phones, 15 px on desktop', async ({ page, isMobile }) => {
  await toCheckout(page);
  const sizes = await page
    .locator('main input:not([type=checkbox]):not([type=radio]):not([type=hidden]), main textarea, main select')
    .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => ({ id: e.id || e.getAttribute('aria-label'), px: parseFloat(getComputedStyle(e).fontSize) })));
  if (isMobile) expect(sizes.filter((s) => s.px < 16)).toEqual([]);
  else expect(await page.locator('#co-email').evaluate((e) => getComputedStyle(e).fontSize)).toBe('15px');
});
