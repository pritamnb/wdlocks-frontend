import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/request-utils';
import { isWcRestConfigured, getOrder, isOrderPaid, majorToMinor, orderMeta, toCheckoutStatus, STRIPE_INTENT_META, WcRestError, type WooRestOrder } from '@/lib/wc-rest';
import { isDemoCheckout, isStripeSandbox, readDemoOrder, writeDemoOrder, toDemoStatus, type DemoOrder } from '@/lib/demo-checkout';
import { getStripe, describeStripeError, isStripeConfigured } from '@/lib/stripe-server';
import type { CheckoutOrderStatus, CheckoutStatusResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORDER_KEY_RE = /^wc_order_[A-Za-z0-9]{1,40}$/;

/** PaymentIntent status → the order status the return page understands (same mapping the webhook applies to real orders). */
function statusFromIntent(status: string, hadError: boolean): CheckoutOrderStatus {
  switch (status) {
    case 'succeeded':
      return 'processing';
    case 'processing':
      return 'on-hold';
    case 'canceled':
      return 'cancelled';
    case 'requires_payment_method':
      return hadError ? 'failed' : 'pending';
    default:
      return 'pending';
  }
}

/**
 * Live stage: what Stripe says about an order WooCommerce does not show as paid yet. The webhook can trail the shopper
 * by seconds, and a late "payment failed" event for an earlier declined attempt can briefly mark a retried order
 * Failed (rehearsal, 17 Nov). Stripe is the record of whether money moved, so the return page asks it directly.
 * Only an intent that belongs to this order (metadata) and matches its total counts.
 */
async function liveStatusFromStripe(order: WooRestOrder, current: CheckoutOrderStatus): Promise<{ status: CheckoutOrderStatus; paid: boolean } | null> {
  if (!isStripeConfigured()) return null;
  const intentId = orderMeta(order, STRIPE_INTENT_META) ?? (order.transaction_id?.startsWith('pi_') ? order.transaction_id : undefined);
  if (!intentId) return null;
  try {
    const intent = await getStripe().paymentIntents.retrieve(intentId);
    if (intent.metadata.wc_order_id !== String(order.id) || intent.amount !== majorToMinor(order.total, 2)) return null;
    if (intent.status === 'succeeded') return { status: 'processing', paid: true };
    if (intent.status === 'processing') return { status: 'on-hold', paid: false };
    // A retry is under way on the same intent: not failed (yet).
    if (current === 'failed' && (intent.status === 'requires_confirmation' || intent.status === 'requires_action')) return { status: 'pending', paid: false };
    return null;
  } catch (err) {
    const info = describeStripeError(err);
    console.warn('[checkout/status] could not read the PaymentIntent; using the order status', { type: info.type, code: info.code });
    return null;
  }
}

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
    // Sandbox stage: the pretend order's status is whatever its real (test-mode) PaymentIntent says.
    if (isStripeSandbox() && order.intentId && order.status === 'pending') {
      try {
        const intent = await getStripe().paymentIntents.retrieve(order.intentId);
        const next: DemoOrder = { ...order, status: statusFromIntent(intent.status, Boolean(intent.last_payment_error)) };
        const res = NextResponse.json(toDemoStatus(next), { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
        if (next.status !== order.status) writeDemoOrder(req, res, next);
        return res;
      } catch (err) {
        const info = describeStripeError(err);
        console.error('[checkout/status] stripe failure (sandbox)', { type: info.type, code: info.code, requestId: info.requestId });
        return errorResponse(502, 'upstream_unavailable', 'Could not read the payment status. Please try again.');
      }
    }
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

    let status = toCheckoutStatus(order.status);
    let paid = isOrderPaid(order);
    if (!paid && (status === 'pending' || status === 'failed')) {
      const fromStripe = await liveStatusFromStripe(order, status);
      if (fromStripe) ({ status, paid } = fromStripe);
    }
    const payload: CheckoutStatusResponse = {
      orderId: order.id,
      orderNumber: order.number,
      status,
      paid,
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
