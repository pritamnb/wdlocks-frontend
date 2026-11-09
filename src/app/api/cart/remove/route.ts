import {
  proxyCartRequest,
  toProxyResponse,
  upstreamDownResponse,
  errorResponse,
  readJson,
  parseCartKey,
} from '@/lib/cart-proxy';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/cart/remove   body: { key: string }   (or ?key=... for clients that strip DELETE bodies)
 * Upstream Store API endpoint is POST /cart/remove-item.
 */
export async function DELETE(req: Request) {
  const body = (await readJson(req)) ?? {};
  const fromQuery = new URL(req.url).searchParams.get('key');
  const key = parseCartKey(body.key ?? fromQuery);
  if (!key) return errorResponse(400, 'invalid_request', 'Invalid cart item key.');

  try {
    const result = await proxyCartRequest(req, '/cart/remove-item', { method: 'POST', body: { key } });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}

export const POST = DELETE;
