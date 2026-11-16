import { test, expect } from '@playwright/test';
import { presetConsent } from './consent';

/**
 * Desktop mega-menu triggers (Locks, Keys & Aftercare). Found in the 16 Nov manual test run: a mouse hover opened the
 * menu and the click that follows closed it again, and on a large touch screen (iPad Pro landscape, 1366 px) a tap
 * never opened it at all.
 */
test.beforeEach(({ page }) => presetConsent(page));

test.describe('desktop mega menu', () => {
  test.skip(({ isMobile }) => isMobile, 'the desktop nav shows from 1280 px');

  test('mouse: hover opens, the following click keeps it open, a later click closes', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    const locks = page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /^Locks/ });
    const box = (await locks.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(locks).toHaveAttribute('aria-expanded', 'true');
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);
    await expect(locks).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(1100);
    await page.mouse.down();
    await page.mouse.up();
    await expect(locks).toHaveAttribute('aria-expanded', 'false');
  });

  test('keyboard: Enter toggles and Escape closes', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    const locks = page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /^Locks/ });
    await locks.focus();
    await page.keyboard.press('Enter');
    await expect(locks).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(locks).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('large touch screen', () => {
  test.use({ viewport: { width: 1366, height: 1024 }, hasTouch: true, isMobile: false });

  test('tap opens Locks, tap switches to Keys, tap closes, tap a product link', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    const locks = nav.getByRole('button', { name: /^Locks/ });
    const keys = nav.getByRole('button', { name: /^Keys/ });
    await locks.tap();
    await expect(locks).toHaveAttribute('aria-expanded', 'true');
    await keys.tap();
    await expect(keys).toHaveAttribute('aria-expanded', 'true');
    await keys.tap();
    await expect(keys).toHaveAttribute('aria-expanded', 'false');
    await locks.tap();
    const link = page.locator('#primary-mega-menu a[href^="/products/"]').first();
    const href = (await link.getAttribute('href'))!.split('#')[0];
    await link.tap();
    await expect(page).toHaveURL((u) => u.pathname === href);
  });
});
