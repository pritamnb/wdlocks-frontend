import { NextResponse } from 'next/server';
import { errorResponse, parseBasketItems, readJson } from '@/lib/request-utils';
import { CouponError, normaliseCouponCode, quoteCoupon } from '@/lib/coupon';
import { RateLimiter, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Guessing codes should be slow: 8 tries a minute per address. */
const limiter = new RateLimiter(8, 60_000);

/**
 * POST /api/checkout/coupon   body: { items: [{ id, quantity }], code }
 * Asks WooCommerce what the promo code takes off this basket (src/lib/coupon.ts). 200 CouponQuote ·
 * 400 coupon_invalid (WooCommerce's reason) / invalid_request · 429 · 502 upstream.
 */
export async function POST(req: Request) {
  if (!limiter.allow(clientIp(req))) {
    return errorResponse(429, 'rate_limited', 'Too many tries. Please wait a minute and try again.');
  }
  const body = await readJson(req);
  if (!body) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');
  const items = parseBasketItems(body.items);
  if (!items) return errorResponse(400, 'empty_cart', 'Your basket is empty or contains an item we no longer sell.');
  const code = normaliseCouponCode(body.code);
  if (!code) return errorResponse(400, 'coupon_invalid', 'Enter a promo code.');

  try {
    const quote = await quoteCoupon(items, code);
    return NextResponse.json(quote, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
  } catch (err) {
    if (err instanceof CouponError) {
      if (err.status >= 500) console.error('[checkout/coupon] check failed', { code: err.code, message: err.message });
      return errorResponse(err.status, err.code, err.message);
    }
    console.error('[checkout/coupon] check failed', err instanceof Error ? err.message : 'unknown error');
    return errorResponse(502, 'upstream_unavailable', 'We could not check that code just now. Please try again.');
  }
}
