import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured, getStripeWebhookSecret } from '@/lib/stripe-server';
import {
  isWcRestConfigured,
  getOrder,
  updateOrder,
  markOrderPaid,
  addOrderNote,
  isOrderPaid,
  minorToMajor,
  WcRestError,
  type WooRestOrder,
} from '@/lib/wc-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Best-effort replay protection: Stripe retries events for up to 3 days and may deliver the same event to
 * several serverless instances, so this Set only catches replays that hit the SAME warm instance. Real
 * idempotency comes from the order checks below (skip when already paid, etc.).
 */
const seenEventIds = new Set<string>();
const MAX_SEEN_EVENTS = 1_000;

function remember(id: string): void {
  seenEventIds.add(id);
  while (seenEventIds.size > MAX_SEEN_EVENTS) {
    const oldest = seenEventIds.values().next();
    if (oldest.done) break;
    seenEventIds.delete(oldest.value);
  }
}

function json(status: number, body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Reads and validates the WooCommerce order referenced by a PaymentIntent's metadata. */
async function orderForIntent(intent: Stripe.PaymentIntent): Promise<WooRestOrder | null> {
  const id = intent.metadata.wc_order_id;
  if (!id || !/^\d{1,12}$/.test(id)) {
    console.warn('[stripe/webhook] intent without wc_order_id metadata', { intentId: intent.id });
    return null;
  }
  const order = await getOrder(Number(id));
  if (intent.metadata.wc_order_key && order.order_key !== intent.metadata.wc_order_key) {
    console.error('[stripe/webhook] order key mismatch', { intentId: intent.id, orderId: order.id });
    return null;
  }
  return order;
}

function money(amount: number, currency: string): string {
  return `${minorToMajor(amount, 2)} ${currency.toUpperCase()}`;
}

/** "card (visa •••• 4242)", "klarna", … — the method the shopper actually used, not every type the intent allowed. */
async function usedMethod(intent: Stripe.PaymentIntent): Promise<string> {
  const pm = intent.payment_method;
  try {
    const method = typeof pm === 'string' ? await getStripe().paymentMethods.retrieve(pm) : pm;
    if (!method) return intent.payment_method_types.join(', ');
    if (method.type === 'card' && method.card) return `card (${method.card.brand} •••• ${method.card.last4})`;
    return method.type;
  } catch {
    return intent.payment_method_types.join(', ');
  }
}

async function onPaymentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  const order = await orderForIntent(intent);
  if (!order) return;
  if (isOrderPaid(order)) return; // replay or already handled

  const methods = await usedMethod(intent);
  const orderMinor = Math.round(Number(order.total) * 100);
  if (intent.currency.toLowerCase() !== order.currency.toLowerCase() || intent.amount !== orderMinor) {
    // Paid, but not what WooCommerce expects — hold it for a human instead of marking it processing.
    await updateOrder(order.id, { status: 'on-hold', transaction_id: intent.id });
    await addOrderNote(
      order.id,
      `Stripe payment ${intent.id} succeeded for ${money(intent.amount, intent.currency)} but the order total is ${order.total} ${order.currency}. Review before fulfilling. Methods: ${methods}.`,
    );
    return;
  }

  await markOrderPaid(order.id, intent.id);
  await addOrderNote(order.id, `Stripe payment succeeded: ${intent.id} — ${money(intent.amount, intent.currency)} via ${methods}.`);
}

async function onPaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const order = await orderForIntent(intent);
  if (!order || isOrderPaid(order)) return;
  const reason = intent.last_payment_error?.message ?? 'no error message supplied';
  if (order.status !== 'failed') await updateOrder(order.id, { status: 'failed' });
  await addOrderNote(order.id, `Stripe payment failed: ${intent.id} — ${reason}`);
}

async function onPaymentProcessing(intent: Stripe.PaymentIntent): Promise<void> {
  const order = await orderForIntent(intent);
  if (!order || isOrderPaid(order)) return;
  if (order.status !== 'on-hold') await updateOrder(order.id, { status: 'on-hold', transaction_id: intent.id });
  await addOrderNote(order.id, `Stripe payment processing (awaiting confirmation, e.g. bank transfer): ${intent.id} via ${await usedMethod(intent)}.`);
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!intentId) return;
  const intent = await getStripe().paymentIntents.retrieve(intentId);
  const order = await orderForIntent(intent);
  if (!order) return;
  const partial = charge.amount_refunded < charge.amount ? 'Partial' : 'Full';
  await addOrderNote(
    order.id,
    `${partial} refund in Stripe: ${money(charge.amount_refunded, charge.currency)} of ${money(charge.amount, charge.currency)} (charge ${charge.id}, intent ${intentId}). Not mirrored automatically — record the refund in WooCommerce if stock or accounts need it.`,
  );
}

/**
 * POST /api/stripe/webhook — Stripe → WooCommerce order lifecycle.
 * Events: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.processing, charge.refunded.
 * 400 bad signature · 503 not configured · 500 when WooCommerce could not be updated (so Stripe retries) · 200 otherwise
 * (including the sandbox stage, where there is no WooCommerce order to update).
 */
export async function POST(req: Request) {
  const secret = getStripeWebhookSecret();
  if (!isStripeConfigured() || !secret) {
    return json(503, { code: 'not-configured', message: 'Webhook is not configured.' });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return json(400, { code: 'missing_signature', message: 'Missing stripe-signature header.' });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.warn('[stripe/webhook] signature verification failed', err instanceof Error ? err.message : 'unknown error');
    return json(400, { code: 'invalid_signature', message: 'Invalid signature.' });
  }

  if (seenEventIds.has(event.id)) return json(200, { received: true, duplicate: true });
  remember(event.id);

  // Sandbox stage (Stripe test keys, no WooCommerce key): the signature path is exercised for real, but there is no
  // order to update — acknowledge so Stripe does not retry.
  if (!isWcRestConfigured()) {
    console.info('[stripe/webhook] sandbox: acknowledged without an order', { eventId: event.id, type: event.type });
    return json(200, { received: true, sandbox: true });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await onPaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await onPaymentFailed(event.data.object);
        break;
      case 'payment_intent.processing':
        await onPaymentProcessing(event.data.object);
        break;
      case 'charge.refunded':
        await onChargeRefunded(event.data.object);
        break;
      default:
        // Not subscribed / not relevant: acknowledge so Stripe does not retry.
        break;
    }
  } catch (err) {
    seenEventIds.delete(event.id); // let the retry through
    const detail = err instanceof WcRestError ? { status: err.status, code: err.code } : err instanceof Error ? err.message : 'unknown error';
    console.error('[stripe/webhook] handler failed', { eventId: event.id, type: event.type, detail });
    return json(500, { code: 'handler_failed', message: 'Could not update the order; Stripe will retry.' });
  }

  return json(200, { received: true });
}
