import { proxyCartRequest, toProxyResponse, upstreamDownResponse } from '@/lib/cart-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/cart — fetch the current basket (creates a session/Cart-Token on first call). */
export async function GET(req: Request) {
  try {
    const result = await proxyCartRequest(req, '/cart', { method: 'GET' });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}
