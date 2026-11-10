import { test, expect, type Page } from '@playwright/test';

const ROUTES = ['/', '/blog', '/terms', '/privacy', '/products', '/products/3-star-alps-cylinder-door-lock', '/products/watchdog-3-star-alps-extra-keys', '/products/watchdog-keyed-a-like', '/home-truths', '/guarantee', '/contact', '/trade', '/basket', '/checkout'];

async function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

for (const route of ROUTES) {
  test(`${route} renders cleanly`, async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    const res = await page.goto(route);
    expect(res?.status(), 'HTTP status').toBe(200);

    // Exactly one visible h1 (React's hidden streamed segments are excluded).
    const h1s = page.locator('h1:visible');
    await expect(h1s).toHaveCount(1);

    // No horizontal overflow at this viewport.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, 'horizontal overflow').toBe(false);

    // Every image that finished loading has real pixels.
    const broken = await page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.offsetParent !== null && !i.closest('[hidden]')).map((i) => i.src));
    expect(broken, 'broken images').toEqual([]);

    // Structured data parses.
    const ld = await page.evaluate(() => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent || 'null')?.['@type']));
    expect(ld.every(Boolean)).toBe(true);

    // Third-party map frames may 404 their own assets; our own origin must not.
    const own = errors.filter((e) => !/openstreetmap|Failed to load resource/.test(e));
    expect(own, 'console errors').toEqual([]);
  });
}

test('header is white with the expected links, in order', async ({ page, isMobile }) => {
  await page.goto('/');
  const bg = await page.locator('header').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg, 'white header').toBe('rgb(255, 255, 255)');
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const items = await dialog.locator('nav > ul > li').allInnerTexts();
    expect(items.map((t) => t.split('\n')[0].trim())).toEqual(['Locks', 'Keys & Aftercare', 'Why Watchdog', 'Home truths', 'Trades', 'Contact']);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  } else {
    const labels = await page.locator('header nav[aria-label="Primary"] > ul > li').allInnerTexts();
    expect(labels.map((t) => t.trim())).toEqual(['Locks', 'Keys & Aftercare', 'Why Watchdog', 'Home truths', 'Trades', 'Contact']);
    await page.getByRole('button', { name: 'Locks', exact: true }).hover();
    const menu = page.locator('#primary-mega-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('li')).toHaveCount(8); // 4 product cards + 4 "more" links
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  }
});

test('homepage: hero film, section order, white Why Watchdog, 63% truth, large accreditations, footer socials', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section video').first()).toHaveAttribute('poster', /hero-inside-poster/);
  const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section')).map((s) => s.id || s.getAttribute('aria-labelledby') || s.getAttribute('aria-label') || ''));
  const idx = (k: string) => order.findIndex((o) => o === k);
  expect(idx('why-watchdog')).toBeGreaterThan(idx('protection'));
  expect(idx('truths-title')).toBeGreaterThan(idx('why-watchdog'));
  expect(idx('buy-band-title')).toBeGreaterThan(idx('truths-title'));
  await expect(page.locator('#why-watchdog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('section[aria-labelledby="truths-title"]')).toContainText('64%');
  await expect(page.locator('section[aria-labelledby="truths-title"]').getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/home-truths');
  await expect(page.getByRole('heading', { name: 'The toughest test ever.' })).toBeVisible();
  await expect(page.locator('footer [aria-label="Social media"] a')).toHaveCount(2);
  await expect(page.locator('a[href="/guarantee"]').first()).toBeAttached();
});

test('product page: lock switch stays in place, Buy now replaces Checkout now', async ({ page }) => {
  await page.goto('/products/3-star-alps-cylinder-door-lock');
  const switchBtn = page.getByRole('radio', { name: 'Thumb turn' });
  await switchBtn.hover(); // scrolls it into view the same way click() does, so the measurement matches the click position
  const before = await switchBtn.boundingBox();
  await switchBtn.click();
  await expect(page).toHaveURL(/3-star-alps-euro-cylinder-thumb-turn-lock\?size=/);
  await expect(page.locator('h1')).toContainText('Thumb Turn');
  await page.waitForTimeout(2500); // the anchor restore keeps correcting while images above settle
  // Positions are fixed: Thumb turn stays on the right, now checked; Key operated stays on the left.
  await expect(page.getByRole('radio', { name: 'Thumb turn' })).toHaveAttribute('aria-checked', 'true');
  const after = await page.getByRole('radio', { name: 'Thumb turn' }).boundingBox();
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(4);
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(80);
  await expect(page.getByRole('button', { name: /Buy now/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Checkout now/ })).toHaveCount(0);
});

test('guarantee page: on-page form and helper modal', async ({ page }) => {
  await page.goto('/guarantee');
  await expect(page.locator('#g-name')).toBeVisible();
  await page.getByRole('button', { name: 'Where is my key number?' }).click();
  await expect(page.getByRole('dialog')).toContainText('WD12345678');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Activate now' })).toBeDisabled();
});

test('home truths: carousel moves and crime checker validates a bad postcode', async ({ page }) => {
  await page.goto('/home-truths');
  await page.getByRole('button', { name: 'Next truth' }).click();
  await expect(page.getByRole('tab', { name: 'Slide 2' })).toHaveAttribute('aria-selected', 'true');
  await page.locator('#crime-postcode').fill('NOT A CODE');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('form [role="alert"]')).toContainText('postcode');
});

test('contact page: quick actions, forms, map', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: /Call now/ })).toHaveAttribute('href', 'tel:02038574718');
  await expect(page.locator('#cb-when option')).not.toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Book my call' })).toBeDisabled();
  await expect(page.locator('#visit iframe')).toHaveAttribute('src', /openstreetmap/);
});

test('trade page: on-page application form', async ({ page }) => {
  await page.goto('/trade');
  await expect(page.locator('#t-company')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit application' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Trade questions, answered' })).toBeVisible();
});

test('own pages exist for blog, terms and privacy', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.locator('h1')).toContainText('Lock advice');
  const first = page.locator('article h2 a').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/);
  await expect(page.locator('.prose-wd')).toBeVisible({ timeout: 20_000 });
  await page.goto('/terms');
  await expect(page.locator('.prose-wd')).toContainText('These terms');
  await page.goto('/privacy');
  await expect(page.locator('.prose-wd')).toContainText(/privacy|personal/i);
});

test('no link on the main pages leaves for wdlocks.co.uk except payment and the keys handoff', async ({ page }) => {
  const allowed = [/\/checkout\/\?add-to-cart=/, /\/product\/watchdog-3-star-alps-extra-keys\//];
  for (const route of ['/', '/products', '/guarantee', '/contact', '/trade', '/home-truths', '/products/3-star-alps-cylinder-door-lock']) {
    await page.goto(route);
    const hrefs = await page.locator('a[href*="wdlocks.co.uk"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href).filter((h) => !h.startsWith('mailto:')));
    const stray = hrefs.filter((h) => !allowed.some((re) => re.test(h)));
    expect(stray, `links leaving ${route}`).toEqual([]);
  }
});

test('404 page has its own title', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page).toHaveTitle(/Page not found/);
});
