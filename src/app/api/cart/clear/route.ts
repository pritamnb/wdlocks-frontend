import { proxyCartRequest, toProxyResponse, upstreamDownResponse } from '@/lib/cart-proxy';

export const dynamic = 'force-dynamic';

/** DELETE /api/cart/clear — empties the headless basket (called when handing off to the WooCommerce checkout). */
export async function DELETE(req: Request) {
  try {
    const result = await proxyCartRequest(req, '/cart/items', { method: 'DELETE' });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}

export const POST = DELETE;
