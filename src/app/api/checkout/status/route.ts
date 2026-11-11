import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/cart-proxy';
import { isWcRestConfigured, getOrder, isOrderPaid, toCheckoutStatus, WcRestError } from '@/lib/wc-rest';
import { isDemoCheckout, readDemoOrder, toDemoStatus } from '@/lib/demo-checkout';
import type { CheckoutStatusResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORDER_KEY_RE = /^wc_order_[A-Za-z0-9]{1,40}$/;

/**
 * GET /api/checkout/status?order=<id>&key=<order_key>
 * The order key acts as the bearer secret (same model as WooCommerce's own order-received page).
 * Responses: 200 CheckoutStatusResponse · 400 invalid · 404 unknown order/key · 502 upstream · 503 not-configured.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const orderParam = params.get('order') ?? '';
  const key = params.get('key') ?? '';

  if (isDemoCheckout() && !isWcRestConfigured()) {
    const order = readDemoOrder(req);
    if (!order || String(order.id) !== orderParam || order.key !== key) return errorResponse(404, 'order_not_found', 'Order not found.');
    return NextResponse.json(toDemoStatus(order), { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
  }
  if (!isWcRestConfigured()) {
    return errorResponse(503, 'not-configured', 'Order status is not available.');
  }

  if (!/^\d{1,12}$/.test(orderParam) || !ORDER_KEY_RE.test(key)) {
    return errorResponse(400, 'invalid_request', 'Missing or invalid order reference.');
  }
  const orderId = Number(orderParam);

  try {
    const order = await getOrder(orderId);
    if (order.order_key !== key) return errorResponse(404, 'order_not_found', 'Order not found.');

    const payload: CheckoutStatusResponse = {
      orderId: order.id,
      orderNumber: order.number,
      status: toCheckoutStatus(order.status),
      paid: isOrderPaid(order),
      total: order.total,
      currency: order.currency,
      ...(order.billing.email ? { email: order.billing.email } : {}),
    };
    return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
  } catch (err) {
    if (err instanceof WcRestError && err.status === 404) return errorResponse(404, 'order_not_found', 'Order not found.');
    console.error('[checkout/status] woo failure', err instanceof WcRestError ? { status: err.status, code: err.code } : 'unknown error');
    return errorResponse(502, 'upstream_unavailable', 'Could not read the order status. Please try again.');
  }
}
