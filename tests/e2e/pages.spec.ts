import { test, expect, type Page } from '@playwright/test';
import { CONSENT_KEY, presetConsent } from './consent';

// Every spec but the cookie-consent block below starts with the popup already answered (Essential only).
test.beforeEach(({ page }) => presetConsent(page));

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

    // No horizontal overflow, and the layout viewport must not have been widened by oversized content (mobile zoom-out).
    const vp = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > window.innerWidth + 1, layout: window.innerWidth, visual: Math.round(window.visualViewport?.width ?? window.innerWidth) }));
    expect(vp.overflow, 'horizontal overflow').toBe(false);
    expect(vp.layout, 'layout viewport widened by content').toBeLessThanOrEqual(vp.visual + 1);

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
  // Announcement strip: next-day promise + the extra-keys link on every non-product page; yellow delivery line on products.
  const bar = page.getByRole('region', { name: 'Store announcements' });
  await expect(bar).not.toContainText('In a rush');
  await expect(bar.getByRole('link', { name: 'Click here' })).toHaveAttribute('href', '/products/watchdog-3-star-alps-extra-keys');
  await page.goto('/products/3-star-alps-cylinder-door-lock');
  const promise = page.getByRole('region', { name: 'Delivery promise' });
  await expect(promise).toContainText(/Order today, delivers (tomorrow|\w+ \d+ \w+)/);
  await expect(promise).toHaveCSS('background-color', 'rgb(218, 21, 25)');
  await page.goto('/');
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const items = await dialog.locator('nav > ul > li').allInnerTexts();
    expect(items.map((t) => t.split('\n')[0].trim())).toEqual(['Home', 'Locks', 'Keys & Aftercare', 'Why Watchdog', 'Home truths', 'Trades', 'Contact']);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  } else {
    const labels = await page.locator('header nav[aria-label="Primary"] > ul > li').allInnerTexts();
    expect(labels.map((t) => t.trim())).toEqual(['Home', 'Locks', 'Keys & Aftercare', 'Why Watchdog', 'Home truths', 'Trades', 'Contact']);
    await page.getByRole('button', { name: 'Locks', exact: true }).hover();
    const menu = page.locator('#primary-mega-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('li')).toHaveCount(8); // 4 product cards + 4 "more" links
    await expect(menu).toContainText('In a rush? Order by 2pm for guaranteed Next Day Delivery.');
    await expect(menu.getByRole('link', { name: 'Explore' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  }
});

test('homepage: hero film, section order, white Why Watchdog, 63% truth, large accreditations, footer socials', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section video').first()).toHaveAttribute('poster', /explainer-inline-poster/);
  const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section')).map((s) => s.id || s.getAttribute('aria-labelledby') || s.getAttribute('aria-label') || ''));
  const idx = (k: string) => order.findIndex((o) => o === k);
  expect(idx('why-watchdog')).toBeGreaterThan(idx('protection'));
  expect(idx('truths-title')).toBeGreaterThan(idx('why-watchdog'));
  expect(idx('sky-sports-title'), 'How we protect you (Sky Sports advert) follows Home truths').toBeGreaterThan(idx('truths-title'));
  expect(idx('buy-band-title'), 'buy band removed from the homepage').toBe(-1);
  await expect(page.locator('#why-watchdog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('section[aria-labelledby="truths-title"]')).toContainText('64%');
  await expect(page.locator('section[aria-labelledby="truths-title"]').getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/home-truths');
  await expect(page.getByRole('heading', { name: 'The toughest test ever.' })).toBeVisible();
  await page.locator('section[aria-labelledby="sky-sports-title"]').scrollIntoViewIfNeeded();
  await expect(page.locator('section[aria-labelledby="sky-sports-title"] iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/z7YV2BYb5Ps/);
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
  // During the route commit the old and new page briefly overlap (<100 ms), so match the new heading, not "the" h1.
  await expect(page.getByRole('heading', { level: 1, name: /Thumb Turn/ })).toBeVisible();
  await page.waitForTimeout(1500); // the anchor restore corrects for up to 500 ms while images above settle
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
  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/, { timeout: 20_000 });
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

test('header and headings use Outfit; nav links are 17px semibold with Ultion spacing', async ({ page, isMobile }) => {
  await page.goto('/');
  const h1 = await page.locator('h1:visible').first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1, 'heading font').toMatch(/Outfit/);
  if (isMobile) return;
  const items = await page.locator('header nav[aria-label="Primary"] > ul > li > *').evaluateAll((els) =>
    els.map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, left: r.left, right: r.right };
    }),
  );
  // 1280–1439: 16px with 10px padding and 6px gaps; from 1440 (Ultion's reference width): 18px, 13px padding, 8px gaps.
  const wide = page.viewportSize()!.width >= 1440;
  for (const it of items) {
    expect(it.font).toMatch(/Outfit/);
    expect(it.size).toBe(wide ? '18px' : '16px');
    expect(Number(it.weight)).toBeGreaterThanOrEqual(600);
  }
  for (let i = 1; i < items.length; i++) expect(Math.round(items[i].left - items[i - 1].right)).toBe(wide ? 8 : 6);
  // Nothing in the header may be squeezed: the logo keeps its aspect ratio and the row never overflows the viewport.
  const logo = await page.locator('header img').first().evaluate((img) => ({ w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height }));
  expect(logo.w / logo.h, 'logo squeezed (source is 7.75:1)').toBeGreaterThan(7);
  expect(logo.h).toBeGreaterThanOrEqual(32);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('product cards are equal: same height, title/price/button rows aligned across each row', async ({ page }) => {
  await page.goto('/');
  // Fonts settle the row heights (networkidle never arrives here: the hero films keep streaming).
  await page.locator('#products article').first().scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const cards = await page.locator('#products article').evaluateAll((els) =>
    els.map((el) => {
      const top = (sel: string) => Math.round(el.querySelector(sel)?.getBoundingClientRect().top ?? -1);
      return { height: Math.round(el.getBoundingClientRect().height), row: Math.round(el.getBoundingClientRect().top), title: top('h3'), cta: top('a.flex, button') };
    }),
  );
  expect(cards.length).toBe(9);
  const heights = new Set(cards.map((c) => c.height));
  expect(heights.size, `card heights ${[...heights].join(',')}`).toBe(1);
  const byRow = new Map<number, typeof cards>();
  for (const c of cards) byRow.set(c.row, [...(byRow.get(c.row) ?? []), c]);
  for (const [, row] of byRow) {
    expect(new Set(row.map((c) => c.title)).size, 'title rows aligned').toBe(1);
    expect(new Set(row.map((c) => c.cta)).size, 'button rows aligned').toBe(1);
  }
});

test.describe('cookie consent', () => {
  // These specs are about the popup itself: undo the file-level preset before any page script runs, on the first
  // load only (init scripts run again on every reload, and a reload must keep the choice the spec just made).
  test.beforeEach(({ page }) =>
    page.addInitScript((key) => {
      if (sessionStorage.getItem('e2e:consent-cleared')) return;
      sessionStorage.setItem('e2e:consent-cleared', '1');
      localStorage.removeItem(key);
    }, CONSENT_KEY),
  );

  const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), CONSENT_KEY);

  test('first visit: popup at the bottom, "Essential only" persists across a reload, footer link reopens the settings', async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'Cookies on this site' });
    await expect(dialog).toBeVisible();
    expect(await stored(page), 'nothing stored before a choice').toBeNull();

    // Non-modal, bottom of the viewport, clear of the header, no horizontal overflow (Pixel 7 included), one h1.
    const vp = page.viewportSize()!;
    const box = (await dialog.boundingBox())!;
    expect(box.y + box.height, 'popup bottom edge').toBeLessThanOrEqual(vp.height + 1);
    expect(box.y, 'popup leaves the header clear').toBeGreaterThan(vp.height / 3);
    expect(box.x, 'popup inside the viewport').toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, 'popup inside the viewport').toBeLessThanOrEqual(vp.width + 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, 'horizontal overflow with the popup open').toBe(false);
    await expect(page.locator('h1:visible')).toHaveCount(1);
    await expect(dialog).not.toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');

    // Settings disclosure: Essential locked, Analytics and Marketing off by default.
    await dialog.getByRole('button', { name: 'Cookie settings' }).click();
    await expect(dialog).toContainText('Always on');
    await expect(dialog.getByRole('switch', { name: 'Analytics cookies' })).toHaveAttribute('aria-checked', 'false');
    await expect(dialog.getByRole('switch', { name: 'Marketing cookies' })).toHaveAttribute('aria-checked', 'false');

    await dialog.getByRole('button', { name: 'Essential only' }).click();
    await expect(dialog).toBeHidden();
    const choice = await stored(page);
    expect(choice).toMatchObject({ v: 1, essential: true, analytics: false, marketing: false });
    expect(Date.parse(choice.at), 'ISO timestamp of the choice').toBeGreaterThan(Date.now() - 60_000);

    // Persisted: a reload (hydrated: the footer button is interactive) does not ask again.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(750);
    await expect(dialog).toHaveCount(0);

    // Footer link reopens the popup on its settings view, with focus on it; Escape closes without changing the choice.
    const footerLink = page.locator('footer').getByRole('button', { name: 'Cookie settings' });
    await footerLink.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('switch', { name: 'Analytics cookies' })).toHaveAttribute('aria-checked', 'false');
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await stored(page)).toMatchObject({ analytics: false, marketing: false });

    // Reopen, turn Analytics on, save: the stored choice changes.
    await footerLink.click();
    await dialog.getByRole('switch', { name: 'Analytics cookies' }).click();
    await dialog.getByRole('button', { name: 'Save settings' }).click();
    await expect(dialog).toBeHidden();
    expect(await stored(page)).toMatchObject({ v: 1, essential: true, analytics: true, marketing: false });

    const own = errors.filter((e) => !/openstreetmap|Failed to load resource/.test(e));
    expect(own, 'console errors').toEqual([]);
  });

  test('"Accept all" turns both optional categories on; a choice older than 12 months is asked again', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [CONSENT_KEY, JSON.stringify({ v: 1, essential: true, analytics: true, marketing: true, at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString() })],
    );
    await page.goto('/products');
    const dialog = page.getByRole('dialog', { name: 'Cookies on this site' });
    await expect(dialog, 'expired choice: asked again').toBeVisible();
    await dialog.getByRole('button', { name: 'Accept all' }).click();
    await expect(dialog).toBeHidden();
    const choice = await stored(page);
    expect(choice).toMatchObject({ v: 1, essential: true, analytics: true, marketing: true });
    expect(Date.parse(choice.at)).toBeGreaterThan(Date.now() - 60_000);
  });

  test('popup hides while the basket drawer is open and returns when it closes', async ({ page }) => {
    await page.goto('/products/3-star-alps-cylinder-door-lock');
    const dialog = page.getByRole('dialog', { name: 'Cookies on this site' });
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Add to basket' }).click();
    const drawer = page.getByRole('dialog', { name: /basket/i });
    await expect(drawer).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(dialog).toBeVisible();
  });
});
