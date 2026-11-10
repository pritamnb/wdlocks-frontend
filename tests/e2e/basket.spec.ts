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
  await expect(page.getByRole('button', { name: 'Continue to secure payment' })).toBeEnabled();

  // Wait for the server to confirm the removal before leaving the page, otherwise the navigation aborts it.
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cart/remove')), page.getByRole('button', { name: /Remove .* from basket/ }).click()]);
  await expect(page.getByText('Nothing to check out yet')).toBeVisible();

  await page.goto('/basket');
  await expect(page.getByText('Your basket is currently empty')).toBeVisible();
});

test('buy now builds a direct wdlocks.co.uk checkout URL (not followed)', async ({ page }) => {
  await page.goto('/products/3-star-alps-cylinder-door-lock');
  await page.waitForLoadState('networkidle');
  // Intercept the navigation instead of leaving the site.
  await page.route('https://wdlocks.co.uk/**', (route) => route.fulfill({ status: 200, body: 'intercepted' }));
  const [request] = await Promise.all([
    page.waitForRequest((r) => r.url().startsWith('https://wdlocks.co.uk/checkout/')),
    page.getByRole('button', { name: /Buy now/ }).first().click(),
  ]);
  const url = new URL(request.url());
  expect(url.searchParams.get('add-to-cart')).toMatch(/^\d+$/);
  expect(url.searchParams.get('quantity')).toBe('1');
  expect(url.searchParams.get('utm_source')).toBe('headless');
});
