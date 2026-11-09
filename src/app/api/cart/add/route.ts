import {
  proxyCartRequest,
  toProxyResponse,
  upstreamDownResponse,
  errorResponse,
  readJson,
  parseProductId,
  parseQuantity,
  parseVariation,
} from '@/lib/cart-proxy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/add   body: { id: number, quantity: number, variation?: [{ attribute, value }] }
 * `id` is the simple product ID or the variation ID. Validated against the catalogue allow-list.
 * Responses: 200 cart · 400 invalid/out of stock · 404 unknown variation · 502 upstream down.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');

  const id = parseProductId(body.id);
  if (id === null) return errorResponse(404, 'unknown_product', 'Unknown product or variation.');

  const quantity = parseQuantity(body.quantity ?? 1);
  if (quantity === null || quantity < 1) return errorResponse(400, 'invalid_request', 'Quantity must be between 1 and 99.');

  const variation = parseVariation(body.variation);
  if (body.variation !== undefined && variation === undefined) {
    return errorResponse(400, 'invalid_request', 'Invalid variation attributes.');
  }

  try {
    const result = await proxyCartRequest(req, '/cart/add-item', {
      method: 'POST',
      body: { id, quantity, ...(variation ? { variation } : {}) },
    });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}
