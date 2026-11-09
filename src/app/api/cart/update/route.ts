import {
  proxyCartRequest,
  toProxyResponse,
  upstreamDownResponse,
  errorResponse,
  readJson,
  parseCartKey,
  parseQuantity,
} from '@/lib/cart-proxy';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/cart/update   body: { key: string, quantity: number }
 * Upstream Store API endpoint is POST /cart/update-item.
 */
export async function PUT(req: Request) {
  const body = await readJson(req);
  if (!body) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');

  const key = parseCartKey(body.key);
  if (!key) return errorResponse(400, 'invalid_request', 'Invalid cart item key.');

  const quantity = parseQuantity(body.quantity);
  if (quantity === null || quantity < 1) return errorResponse(400, 'invalid_request', 'Quantity must be between 1 and 99. Use DELETE to remove an item.');

  try {
    const result = await proxyCartRequest(req, '/cart/update-item', { method: 'POST', body: { key, quantity } });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}

/** Some clients can't send PUT; accept POST as an alias. */
export const POST = PUT;
