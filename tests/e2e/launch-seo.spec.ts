import { test, expect } from '@playwright/test';

/**
 * Launch checks from the redirects and SEO handover (18 Nov 2026): the second round of old WordPress redirects, noindex
 * on every copy except wdlocks.co.uk, and no Google tag before the visitor answers the cookie popup.
 */

const REDIRECTS: [string, string][] = [
  ['/product/watchdog-3-star-alps-thumb-turn-lock', '/products/3-star-alps-euro-cylinder-thumb-turn-lock'],
  ['/product/watchdog-3-star-alps-cylinder-lock', '/products/3-star-alps-cylinder-door-lock'],
  ['/product/watchdog-keyed-a-like-master-key', '/products/watchdog-keyed-a-like'],
  ['/keyed-alike-locks-explained', '/blog/keyed-alike-locks-explained'],
  ['/product-tag/3-star', '/products'],
  ['/.shop', '/products'],
  ['/my-blog', '/blog'],
  ['/my-account/lost-password', '/'],
  ['/testimonials/page/2', 'https://wdlocksmiths.co.uk/testimonials/'],
  ['/services/auto-locksmith', 'https://wdlocksmiths.co.uk/'],
  ['/door-lock-replacement', 'https://wdlocksmiths.co.uk/lock-replacement/'],
  ['/about-us', 'https://wdlocksmiths.co.uk/about-watchdog-locksmiths-greenford/'],
  ['/kilburn-locksmithss', 'https://wdlocksmiths.co.uk/locksmith-near-me/locksmith-kilburn/'],
];

for (const [from, to] of REDIRECTS) {
  test(`${from} redirects permanently to ${to}`, async ({ request, baseURL }) => {
    const res = await request.get(from, { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(new URL(res.headers()['location'], baseURL).href).toBe(new URL(to, baseURL).href);
  });
}

test('only wdlocks.co.uk is indexable', async ({ page, baseURL }) => {
  const live = new URL(baseURL!).origin === 'https://wdlocks.co.uk';
  const res = await page.goto('/');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  if (live) {
    expect(robots).toContain('index, follow');
    expect(res?.headers()['x-robots-tag']).toBeUndefined();
  } else {
    expect(robots).toContain('noindex');
    expect(res?.headers()['x-robots-tag']).toContain('noindex');
  }
});

test('no Google tag loads before the cookie popup is answered', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', (r) => {
    if (/googletagmanager\.com|google-analytics\.com|clarity\.ms|facebook\.com\/tr/.test(r.url())) googleRequests.push(r.url());
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Accept all' })).toBeVisible();
  expect(googleRequests).toEqual([]);
});
