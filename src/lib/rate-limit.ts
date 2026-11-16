/**
 * Fixed-window rate limits for the API routes, keyed by client IP (src/lib/client-ip.ts).
 *
 * Store: a shared Redis reached over the Upstash REST protocol when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * (or Vercel's KV_REST_API_URL + KV_REST_API_TOKEN) are set, so every serverless instance / Node process counts
 * against the same window. Without them, or when the store does not answer within STORE_TIMEOUT_MS, each instance
 * counts in its own memory: best effort, reset on cold start, but still stops one client hammering one instance.
 *
 * IPs are stored as an HMAC (keyed by the store token), never in clear, and expire with their window.
 */
import { createHmac } from 'node:crypto';
import { clientIp } from '@/lib/client-ip';

export interface RateRule {
  limit: number;
  windowSec: number;
}

/** Per-route limits. Each route is checked against every rule; the first one exceeded answers 429. */
export const RATE_LIMITS = {
  /** Every call can create a WooCommerce order and a Stripe PaymentIntent. */
  checkoutIntent: [
    { limit: 10, windowSec: 60 },
    { limit: 30, windowSec: 60 * 60 },
  ],
  /** Guessing promo codes should be slow. */
  checkoutCoupon: [
    { limit: 8, windowSec: 60 },
    { limit: 40, windowSec: 60 * 60 },
  ],
  /** Sends an email to the sales inbox. */
  contact: [
    { limit: 5, windowSec: 10 * 60 },
    { limit: 20, windowSec: 24 * 60 * 60 },
  ],
  /** Posts to the Elementor form on wdlocks.co.uk. */
  trade: [
    { limit: 3, windowSec: 10 * 60 },
    { limit: 10, windowSec: 24 * 60 * 60 },
  ],
  /** Posts to the Elementor form on wdlocks.co.uk; an installer may register several customers' locks from one office. */
  guarantee: [
    { limit: 10, windowSec: 10 * 60 },
    { limit: 50, windowSec: 24 * 60 * 60 },
  ],
  /** Calls postcodes.io and data.police.uk (shared upstream limits). */
  crime: [
    { limit: 20, windowSec: 60 },
    { limit: 200, windowSec: 24 * 60 * 60 },
  ],
} satisfies Record<string, RateRule[]>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the exceeded window resets (0 when ok). */
  retryAfter: number;
}

/* ---------------------------------------------------------------------------
 * In-memory fallback
 * ------------------------------------------------------------------------- */

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 5_000;

/** One instance's fixed-window counter. Exported for tests; routes use `rateLimit()`. */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Counts the call; `ok` is false once the key has exceeded `limit` within the window. */
  hit(key: string, now = Date.now()): RateLimitResult {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (this.buckets.size >= MAX_TRACKED_KEYS) this.prune(now);
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    const ok = bucket.count <= this.limit;
    return { ok, retryAfter: ok ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    // Still full of live buckets? Drop the oldest entries (Map preserves insertion order).
    while (this.buckets.size >= MAX_TRACKED_KEYS) {
      const oldest = this.buckets.keys().next();
      if (oldest.done) break;
      this.buckets.delete(oldest.value);
    }
  }
}

const memory = new Map<string, RateLimiter>();

function memoryHit(name: string, rules: readonly RateRule[], ip: string, now: number): RateLimitResult {
  let worst: RateLimitResult = { ok: true, retryAfter: 0 };
  for (const rule of rules) {
    const id = `${name}:${rule.windowSec}`;
    let limiter = memory.get(id);
    if (!limiter) {
      limiter = new RateLimiter(rule.limit, rule.windowSec * 1000);
      memory.set(id, limiter);
    }
    const r = limiter.hit(ip, now);
    if (!r.ok && (worst.ok || r.retryAfter > worst.retryAfter)) worst = r;
  }
  return worst;
}

/* ---------------------------------------------------------------------------
 * Shared store (Upstash REST protocol)
 * ------------------------------------------------------------------------- */

const STORE_TIMEOUT_MS = 800;
const KEY_PREFIX = 'wd:rl';

interface StoreConfig {
  url: string;
  token: string;
}

export function rateLimitStore(env: NodeJS.ProcessEnv = process.env): StoreConfig | null {
  const url = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '').trim().replace(/\/+$/, '');
  const token = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '').trim();
  if (!url || !token || !/^https:\/\//.test(url)) return null;
  return { url, token };
}

let storeWarned = 0;

/** INCR + EXPIRE for every rule in one pipeline request. Throws on any store failure (the caller falls back). */
async function storeHit(store: StoreConfig, name: string, rules: readonly RateRule[], ip: string, now: number): Promise<RateLimitResult> {
  const subject = createHmac('sha256', store.token).update(ip).digest('base64url').slice(0, 22);
  const windows = rules.map((rule) => {
    const index = Math.floor(now / 1000 / rule.windowSec);
    return { rule, key: `${KEY_PREFIX}:${name}:${rule.windowSec}:${index}:${subject}`, resetAt: (index + 1) * rule.windowSec * 1000 };
  });
  const commands = windows.flatMap(({ rule, key }) => [
    ['INCR', key],
    ['EXPIRE', key, String(rule.windowSec + 5)],
  ]);
  const res = await fetch(`${store.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${store.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    cache: 'no-store',
    signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`store answered ${res.status}`);
  const replies = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(replies) || replies.length !== commands.length) throw new Error('unexpected store reply');

  let worst: RateLimitResult = { ok: true, retryAfter: 0 };
  windows.forEach(({ rule, resetAt }, i) => {
    const reply = replies[i * 2];
    if (reply?.error || typeof reply?.result !== 'number') throw new Error(reply?.error ?? 'INCR returned no count');
    if (reply.result > rule.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
      if (worst.ok || retryAfter > worst.retryAfter) worst = { ok: false, retryAfter };
    }
  });
  return worst;
}

/**
 * Counts this request against the route's limits. Never throws: a store outage falls back to the in-memory counter
 * (logged at most once a minute), so a Redis problem cannot take the checkout down.
 */
export async function rateLimit(req: Request, name: RateLimitName, now = Date.now()): Promise<RateLimitResult> {
  const rules = RATE_LIMITS[name];
  const ip = clientIp(req);
  const store = rateLimitStore();
  if (store) {
    try {
      return await storeHit(store, name, rules, ip, now);
    } catch (err) {
      if (now - storeWarned > 60_000) {
        storeWarned = now;
        console.error('[rate-limit] shared store unavailable, counting in memory', err instanceof Error ? err.message : 'unknown error');
      }
    }
  }
  return memoryHit(name, rules, ip, now);
}

/** Retry-After header for a 429. */
export function retryAfterHeaders(result: RateLimitResult): Record<string, string> {
  return { 'Retry-After': String(result.retryAfter), 'Cache-Control': 'no-store, private' };
}
