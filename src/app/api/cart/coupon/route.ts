import {
  proxyCartRequest,
  toProxyResponse,
  upstreamDownResponse,
  errorResponse,
  readJson,
  parseCouponCode,
} from '@/lib/cart-proxy';

export const dynamic = 'force-dynamic';

async function readCode(req: Request): Promise<string | null> {
  const body = (await readJson(req)) ?? {};
  const fromQuery = new URL(req.url).searchParams.get('code');
  return parseCouponCode(body.code ?? fromQuery);
}

/**
 * POST /api/cart/coupon   body: CouponRequest { code }  → Store API POST /cart/apply-coupon
 * Responses: 200 cart · 400 invalid or rejected coupon (upstream message passed through) · 502.
 */
export async function POST(req: Request) {
  const code = await readCode(req);
  if (!code) return errorResponse(400, 'invalid_coupon', 'Enter a valid coupon code.');

  try {
    const result = await proxyCartRequest(req, '/cart/apply-coupon', { method: 'POST', body: { code } });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}

/**
 * DELETE /api/cart/coupon   body: CouponRequest { code }  (or ?code=… for clients that strip DELETE bodies)
 * → Store API POST /cart/remove-coupon
 */
export async function DELETE(req: Request) {
  const code = await readCode(req);
  if (!code) return errorResponse(400, 'invalid_coupon', 'Enter a valid coupon code.');

  try {
    const result = await proxyCartRequest(req, '/cart/remove-coupon', { method: 'POST', body: { code } });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}
