import { NextResponse } from 'next/server';
import { errorResponse, parseBasketItems, readJson } from '@/lib/request-utils';
import { CouponError, normaliseCouponCode, quoteCoupon } from '@/lib/coupon';
import { rateLimit, retryAfterHeaders } from '@/lib/rate-limit';
import { isExampleCoupon } from '@/lib/example-coupons';
import { PricingError, quoteExampleForItems } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/checkout/coupon   body: { items: [{ id, quantity }], code }
 * Asks WooCommerce what the promo code takes off this basket (src/lib/coupon.ts; example codes on the test checkouts:
 * src/lib/example-coupons.ts). 200 CouponQuote ·
 * 400 coupon_invalid (WooCommerce's reason) / invalid_request · 429 · 502 upstream.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  const items = body ? parseBasketItems(body.items) : null;
  const code = body ? normaliseCouponCode(body.code) : null;
  // The example codes are printed on the test checkouts, so trying them is not guessing.
  const example = Boolean(items && code && isExampleCoupon(code));

  // Guessing codes should be slow (RATE_LIMITS.checkoutCoupon); every other request counts, malformed ones included.
  if (!example) {
    const limited = await rateLimit(req, 'checkoutCoupon');
    if (!limited.ok) {
      const res = errorResponse(429, 'rate_limited', 'Too many tries. Please wait a few minutes and try again.');
      for (const [k, v] of Object.entries(retryAfterHeaders(limited))) res.headers.set(k, v);
      return res;
    }
  }
  if (!body) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');
  if (!items) return errorResponse(400, 'empty_cart', 'Your basket is empty or contains an item we no longer sell.');
  if (!code) return errorResponse(400, 'coupon_invalid', 'Enter a promo code.');

  try {
    const quote = example ? await quoteExampleForItems(items, code) : await quoteCoupon(items, code);
    return NextResponse.json(quote, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
  } catch (err) {
    if (err instanceof CouponError || err instanceof PricingError) {
      if (err.status >= 500) console.error('[checkout/coupon] check failed', { code: err.code, message: err.message });
      return errorResponse(err.status, err.code, err.message);
    }
    console.error('[checkout/coupon] check failed', err instanceof Error ? err.message : 'unknown error');
    return errorResponse(502, 'upstream_unavailable', 'We could not check that code just now. Please try again.');
  }
}
