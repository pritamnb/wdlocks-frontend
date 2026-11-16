import { test, expect, type APIRequestContext } from '@playwright/test';
import { presetConsent } from './consent';
import { RATE_LIMITS, rateLimit, type RateLimitName } from '../../src/lib/rate-limit';
import { clientIp, rightmostForwardedFor } from '../../src/lib/client-ip';

/**
 * Abuse protection (README "Abuse protection"): per-IP rate limits on the six write routes, the client-IP source,
 * and the Turnstile check.
 *
 * Local builds only: on a deployed site every request comes from the tester's real IP, so filling the buckets would
 * lock this machine out of the checkout for an hour. Locally (no proxy, CLIENT_IP_HEADER unset, TRUSTED_PROXY_COUNT=1)
 * the rightmost X-Forwarded-For entry is the key, so each test sends its own made-up address and gets its own bucket.
 * The bodies are deliberately invalid, so nothing is emailed, posted to wdlocks.co.uk or priced: the limit is counted
 * before validation. Start the server with blank WC/Stripe keys (memory: .env.local creates real orders).
 *
 * Turnstile block: run against a build made with Cloudflare's test keys and set E2E_TURNSTILE=1:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
 */
const BASE = process.env.E2E_BASE_URL ?? 'https://wdlocks-frontend.vercel.app';
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(BASE);
const TURNSTILE = process.env.E2E_TURNSTILE === '1';

test.beforeEach(({ page }) => presetConsent(page));

/** A random private-range address, so each test has its own bucket. */
function fakeIp(): string {
  const n = () => Math.floor(Math.random() * 250) + 1;
  return `10.${n()}.${n()}.${n()}`;
}

const ROUTES: Record<RateLimitName, string> = {
  checkoutIntent: '/api/checkout/intent',
  checkoutCoupon: '/api/checkout/coupon',
  contact: '/api/contact',
  trade: '/api/trade',
  guarantee: '/api/guarantee',
  crime: '/api/crime',
};

async function post(request: APIRequestContext, path: string, xff: string, data: unknown = {}, headers: Record<string, string> = {}) {
  return request.post(path, { data, headers: { 'X-Forwarded-For': xff, ...headers }, failOnStatusCode: false });
}

test.describe('client IP source', () => {
  const req = (headers: Record<string, string>) => new Request('http://localhost/api/x', { headers });

  test('X-Forwarded-For is read from the right: the visitor-written left entries are ignored', () => {
    expect(rightmostForwardedFor('6.6.6.6, 203.0.113.9', 1)).toBe('203.0.113.9');
    expect(rightmostForwardedFor('6.6.6.6, 203.0.113.9, 10.0.0.2', 2)).toBe('203.0.113.9');
    // Shorter chain than the trusted proxy count: the leftmost entry is all there is.
    expect(rightmostForwardedFor('203.0.113.9', 3)).toBe('203.0.113.9');
    expect(rightmostForwardedFor('not-an-ip', 1)).toBeNull();
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, [2001:db8::1]:443' }), { kind: 'xff', hops: 1 })).toBe('2001:db8::1');
  });

  test('Vercel: the platform header wins over a forged X-Forwarded-For', () => {
    const r = req({ 'x-forwarded-for': '6.6.6.6', 'x-vercel-forwarded-for': '203.0.113.9', 'x-real-ip': '203.0.113.9' });
    expect(clientIp(r, { kind: 'vercel' })).toBe('203.0.113.9');
    expect(clientIp(req({ 'x-real-ip': '203.0.113.10' }), { kind: 'vercel' })).toBe('203.0.113.10');
  });

  test('CLIENT_IP_HEADER names the one header the proxy overwrites', () => {
    const r = req({ 'x-forwarded-for': '6.6.6.6', 'cf-connecting-ip': '203.0.113.9:51234' });
    expect(clientIp(r, { kind: 'header', name: 'cf-connecting-ip' })).toBe('203.0.113.9');
    expect(clientIp(req({}), { kind: 'header', name: 'cf-connecting-ip' })).toBe('unknown');
  });
});

test.describe('shared rate-limit store (Upstash REST protocol, stubbed)', () => {
  test('counts in the store with one pipelined call, keys by HMAC, falls back to memory when the store fails', async () => {
    const realFetch = globalThis.fetch;
    const saved = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
    const counts = new Map<string, number>();
    const calls: Array<{ url: string; auth: string | null; commands: string[][] }> = [];
    process.env.UPSTASH_REDIS_REST_URL = 'https://store.example/';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const commands = JSON.parse(String(init?.body)) as string[][];
      calls.push({ url: String(url), auth: new Headers(init?.headers).get('authorization'), commands });
      const replies = commands.map(([cmd, key]) => {
        if (cmd !== 'INCR') return { result: 1 };
        counts.set(key, (counts.get(key) ?? 0) + 1);
        return { result: counts.get(key) };
      });
      return new Response(JSON.stringify(replies), { status: 200 });
    }) as typeof fetch;
    try {
      const ip = '10.77.0.1';
      const req = () => new Request('http://localhost/api/contact', { headers: { 'x-forwarded-for': ip } });
      const { limit } = RATE_LIMITS.contact[0];
      for (let i = 0; i < limit; i++) expect((await rateLimit(req(), 'contact')).ok).toBe(true);
      const blocked = await rateLimit(req(), 'contact');
      expect(blocked.ok).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);

      expect(calls).toHaveLength(limit + 1);
      expect(calls[0].url).toBe('https://store.example/pipeline');
      expect(calls[0].auth).toBe('Bearer test-token');
      // INCR + EXPIRE per rule (contact has two windows), all in one request; the IP never appears in a key.
      expect(calls[0].commands.map((c) => c[0])).toEqual(['INCR', 'EXPIRE', 'INCR', 'EXPIRE']);
      expect(calls[0].commands.every((c) => !c[1].includes(ip))).toBe(true);

      // Store down: the request is still counted, in this process's memory, and never throws.
      globalThis.fetch = (async () => new Response('unavailable', { status: 503 })) as typeof fetch;
      const other = () => new Request('http://localhost/api/contact', { headers: { 'x-forwarded-for': '10.77.0.2' } });
      for (let i = 0; i < limit; i++) expect((await rateLimit(other(), 'contact')).ok).toBe(true);
      expect((await rateLimit(other(), 'contact')).ok).toBe(false);
    } finally {
      globalThis.fetch = realFetch;
      if (saved.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = saved.url;
      if (saved.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = saved.token;
    }
  });
});

test.describe('rate limits', () => {
  test.skip(!LOCAL, 'Fills real rate-limit buckets; local builds only');

  for (const [name, path] of Object.entries(ROUTES) as Array<[RateLimitName, string]>) {
    const { limit } = RATE_LIMITS[name][0];
    test(`${path} answers 429 with Retry-After after ${limit} calls`, async ({ request }) => {
      const ip = fakeIp();
      for (let i = 0; i < limit; i++) {
        const res = await post(request, path, ip);
        expect(res.status(), `call ${i + 1}: ${await res.text()}`).not.toBe(429);
      }
      const blocked = await post(request, path, ip);
      expect(blocked.status()).toBe(429);
      expect(Number(blocked.headers()['retry-after'])).toBeGreaterThan(0);
      // Another address is not affected.
      expect((await post(request, path, fakeIp())).status()).not.toBe(429);
    });
  }

  test('a forged left-hand X-Forwarded-For entry does not buy a fresh bucket', async ({ request }) => {
    const real = fakeIp();
    const { limit } = RATE_LIMITS.crime[0];
    for (let i = 0; i < limit; i++) await post(request, ROUTES.crime, `${fakeIp()}, ${real}`);
    expect((await post(request, ROUTES.crime, `${fakeIp()}, ${real}`)).status()).toBe(429);
  });
});

test.describe('Turnstile', () => {
  test.skip(!LOCAL || !TURNSTILE, 'Needs a local build with Cloudflare test keys and E2E_TURNSTILE=1');

  const message = { kind: 'message', name: 'Test Shopper', email: 'test@example.com', subject: 'Test', message: 'Automated test, please ignore.' };

  test('server refuses a protected form without a token, accepts Cloudflare test token', async ({ request }) => {
    const ip = fakeIp();
    const missing = await post(request, ROUTES.contact, ip, message);
    expect(missing.status()).toBe(403);
    expect(((await missing.json()) as { reason?: string }).reason).toBe('turnstile');
    // Test secret 1x… accepts the dummy token; the route then reaches email delivery (503 without RESEND_API_KEY).
    const ok = await post(request, ROUTES.contact, ip, message, { 'X-Turnstile-Token': 'XXXX.DUMMY.TOKEN.XXXX' });
    expect(ok.status(), await ok.text()).not.toBe(403);
  });

  test('contact form gets a token from the widget and sends it', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Your name').nth(1).fill('Test Shopper');
    await page.getByLabel('Your email address').fill('test@example.com');
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Automated test, please ignore.');
    const sent = page.waitForRequest((r) => r.url().endsWith('/api/contact') && r.method() === 'POST');
    const answered = page.waitForResponse((r) => r.url().endsWith('/api/contact'));
    await page.getByRole('button', { name: 'Send message' }).click();
    expect((await sent).headers()['x-turnstile-token']).toBeTruthy();
    expect((await answered).status()).not.toBe(403);
  });

  test('Place order (demo checkout) carries a token and the server accepts it', async ({ page }) => {
    await page.goto('/products/bruno-teddy-protection-car-key-signal-blocker');
    await page.getByRole('button', { name: 'Add to basket' }).click();
    await expect(page.getByRole('dialog')).toContainText('Bruno');
    await page.goto('/checkout');
    await page.getByLabel('Email').waitFor({ timeout: 30_000 });
    const isDemo = await page.getByText('Demo payment.', { exact: false }).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.skip(!isDemo, 'Not a demo-checkout build');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Phone').fill('02038574718');
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('Shopper');
    await page.getByLabel('Address line 1').fill('397 Greenford Road');
    await page.getByLabel('Town / city').fill('Greenford');
    await page.getByLabel('Postcode').fill('UB6 8RF');
    await page.getByLabel('Card number').fill('4242424242424242');
    await page.getByLabel('Expiry').fill('1230');
    await page.getByLabel('Security code').fill('123');
    await page.getByLabel('Name on card').fill('Test Shopper');
    await page.getByLabel(/terms and conditions/).check();
    const sent = page.waitForRequest((r) => r.url().includes('/api/checkout/intent') && r.method() === 'POST');
    const answered = page.waitForResponse((r) => r.url().includes('/api/checkout/intent'));
    await page.getByRole('button', { name: /^Pay £/ }).click();
    expect((await sent).headers()['x-turnstile-token']).toBeTruthy();
    const res = await answered;
    expect(res.status(), await res.text()).toBe(200);
    await expect(page).toHaveURL(/\/checkout\/return\?/, { timeout: 20_000 });
  });
});
