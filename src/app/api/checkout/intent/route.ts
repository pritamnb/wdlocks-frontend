import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  proxyCartRequest,
  upstreamDownResponse,
  errorResponse,
  readJson,
  parseAddress,
  isSecureRequest,
} from '@/lib/cart-proxy';
import { cartHash, selectedRateIds } from '@/lib/checkout-cart-hash';
import { getStripe, isStripeConfigured, describeStripeError } from '@/lib/stripe-server';
import {
  isWcRestConfigured,
  createOrder,
  getOrder,
  updateOrder,
  addOrderNote,
  orderMeta,
  majorToMinor,
  toRestBillingAddress,
  toRestShippingAddress,
  WcRestError,
  STRIPE_INTENT_META,
  type WooRestOrder,
} from '@/lib/wc-rest';
import { RateLimiter, clientIp } from '@/lib/rate-limit';
import { isDemoCheckout, isStripeSandbox, newDemoOrder, writeDemoOrder } from '@/lib/demo-checkout';
import type { WooCart, CheckoutAddressInput, CreatePaymentIntentResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** `${orderId}:${orderKey}:${cartHash}` — lets a retry (back button, second click) reuse the pending order. */
export const CHECKOUT_ORDER_COOKIE = 'wd_checkout_order';
const CHECKOUT_ORDER_COOKIE_TTL = 60 * 60 * 24; // 1 day
const CUSTOMER_NOTE_MAX = 500;
const CART_HASH_MAX = 64;
/** Stripe's minimum charge for GBP is 30p. */
const MIN_AMOUNT_MINOR = 30;

const limiter = new RateLimiter(10, 60_000);

interface ValidBody {
  billing: CheckoutAddressInput;
  shipping: CheckoutAddressInput;
  customerNote: string | undefined;
  expectedTotal: string;
}

function parseBody(body: Record<string, unknown>): { ok: true; value: ValidBody } | { ok: false; message: string } {
  const billing = parseAddress(body.billing_address);
  if (!billing) return { ok: false, message: 'Check the billing address: name, address, town, postcode and country are required.' };

  let shipping: CheckoutAddressInput = billing;
  if (body.shipping_address !== undefined && body.shipping_address !== null) {
    const parsed = parseAddress(body.shipping_address);
    if (!parsed) return { ok: false, message: 'Check the delivery address: name, address, town, postcode and country are required.' };
    shipping = parsed;
  }

  let customerNote: string | undefined;
  if (body.customer_note !== undefined && body.customer_note !== null) {
    if (typeof body.customer_note !== 'string' || body.customer_note.length > CUSTOMER_NOTE_MAX) {
      return { ok: false, message: `Order notes must be ${CUSTOMER_NOTE_MAX} characters or fewer.` };
    }
    customerNote = body.customer_note.trim() || undefined;
  }

  if (typeof body.expected_total !== 'string' || !/^\d{1,12}$/.test(body.expected_total)) {
    return { ok: false, message: 'expected_total must be the basket total in pence.' };
  }

  if (body.cart_hash !== undefined && body.cart_hash !== null) {
    if (typeof body.cart_hash !== 'string' || body.cart_hash.length > CART_HASH_MAX || !/^[A-Za-z0-9_-]*$/.test(body.cart_hash)) {
      return { ok: false, message: 'Invalid cart_hash.' };
    }
    // Accepted for the contract's sake; the server recomputes its own hash from the live cart below.
  }

  return { ok: true, value: { billing, shipping, customerNote, expectedTotal: body.expected_total } };
}

function readOrderCookie(req: Request): { orderId: number; orderKey: string; hash: string } | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1 || part.slice(0, idx).trim() !== CHECKOUT_ORDER_COOKIE) continue;
    const m = /^(\d{1,12}):(wc_order_[A-Za-z0-9]{1,40}):([a-f0-9]{32})$/.exec(decodeURIComponent(part.slice(idx + 1).trim()));
    if (!m) return null;
    return { orderId: Number(m[1]), orderKey: m[2], hash: m[3] };
  }
  return null;
}

function orderTotalMinor(order: WooRestOrder, cart: WooCart): number {
  return majorToMinor(order.total, cart.totals.currency_minor_unit);
}

/** Reuses the pending order named in the cookie when it still matches this cart; refreshes its addresses. */
async function findReusableOrder(req: Request, cart: WooCart, hash: string, body: ValidBody): Promise<WooRestOrder | null> {
  const cookie = readOrderCookie(req);
  if (!cookie || cookie.hash !== hash) return null;
  let order: WooRestOrder;
  try {
    order = await getOrder(cookie.orderId);
  } catch {
    return null;
  }
  if (order.order_key !== cookie.orderKey || order.status !== 'pending') return null;
  if (orderTotalMinor(order, cart) !== Number(cart.totals.total_price)) return null;
  try {
    return await updateOrder(order.id, {
      billing: toRestBillingAddress(body.billing),
      shipping: toRestShippingAddress(body.shipping),
      customer_note: body.customerNote ?? '',
    });
  } catch {
    return null; // fall through to creating a fresh order
  }
}

function toStripeShipping(address: CheckoutAddressInput): Stripe.PaymentIntentCreateParams.Shipping {
  return {
    name: `${address.first_name} ${address.last_name}`.trim(),
    ...(address.phone ? { phone: address.phone } : {}),
    address: {
      line1: address.address_1,
      ...(address.address_2 ? { line2: address.address_2 } : {}),
      city: address.city,
      ...(address.state ? { state: address.state } : {}),
      postal_code: address.postcode,
      country: address.country,
    },
  };
}

/**
 * POST /api/checkout/intent   body: CreatePaymentIntentRequest
 * 1. Re-reads the basket by Cart-Token (never trusts client totals), 2. creates/reuses a pending WooCommerce
 * order priced by WooCommerce itself and checks it equals the Store API total, 3. creates/reuses a Stripe
 * PaymentIntent for that amount and records it on the order.
 * Responses: 200 CreatePaymentIntentResponse · 400 invalid · 409 total_mismatch / already_paid ·
 * 429 rate_limited · 502 upstream failure · 503 not-configured.
 */
export async function POST(req: Request) {
  if (!limiter.allow(clientIp(req))) {
    return errorResponse(429, 'rate_limited', 'Too many checkout attempts. Please wait a minute and try again.');
  }
  // Rollout stages: demo (pretend provider) → sandbox (Stripe test keys, pretend orders) → live (Stripe + WooCommerce).
  const sandbox = isStripeSandbox();
  const demo = isDemoCheckout() && !sandbox && !(isStripeConfigured() && isWcRestConfigured());
  if (!demo && !sandbox && (!isStripeConfigured() || !isWcRestConfigured())) {
    return errorResponse(503, 'not-configured', 'Card payments are not available yet. Please use the WooCommerce checkout.');
  }

  const raw = await readJson(req);
  if (!raw) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');
  const parsed = parseBody(raw);
  if (!parsed.ok) return errorResponse(400, 'invalid_request', parsed.message);
  const body = parsed.value;

  // 1. Live basket
  let cart: WooCart;
  try {
    const result = await proxyCartRequest(req, '/cart', { method: 'GET' });
    if (result.status < 200 || result.status >= 300 || !('items' in result.body)) {
      return errorResponse(502, 'upstream_unavailable', 'Could not read your basket. Please try again.');
    }
    cart = result.body;
  } catch (err) {
    return upstreamDownResponse(err);
  }

  if (cart.items.length === 0) return errorResponse(400, 'empty_cart', 'Your basket is empty.');
  if (cart.totals.currency_code !== 'GBP') return errorResponse(400, 'unsupported_currency', 'Only GBP baskets can be paid here.');
  if (cart.needs_shipping) {
    const rates = selectedRateIds(cart);
    if (cart.shipping_rates.length === 0 || rates.length !== cart.shipping_rates.length) {
      return errorResponse(400, 'shipping_required', 'Choose a delivery option before paying.');
    }
  }
  if (!/^\d+$/.test(cart.totals.total_price)) {
    return errorResponse(502, 'upstream_unavailable', 'Could not read your basket total. Please try again.');
  }
  const totalMinor = Number(cart.totals.total_price);
  if (totalMinor < MIN_AMOUNT_MINOR) return errorResponse(400, 'amount_too_small', 'The basket total is too small to pay by card.');
  if (cart.totals.total_price !== body.expectedTotal) {
    return errorResponse(409, 'total_mismatch', 'Your basket total has changed. Please review it and try again.');
  }

  const hash = cartHash(cart);

  // Sandbox stage: a real Stripe PaymentIntent (test mode) for a pretend order held in the signed cookie. The return
  // page reads the intent's outcome through /api/checkout/status; WooCommerce is never touched.
  if (sandbox) {
    const order = newDemoOrder(totalMinor, body.billing.email ?? '', body.customerNote);
    let intent: Stripe.PaymentIntent;
    try {
      intent = await getStripe().paymentIntents.create(
        {
          amount: totalMinor,
          currency: 'gbp',
          automatic_payment_methods: { enabled: true },
          metadata: { sandbox: 'true', demo_order_id: String(order.id), demo_order_key: order.key, cart_hash: hash },
          description: `WD Locks sandbox order #${order.number} (not a real order)`,
          ...(body.billing.email ? { receipt_email: body.billing.email } : {}),
          shipping: toStripeShipping(body.shipping),
        },
        { idempotencyKey: `demo-order-${order.id}-${totalMinor}` },
      );
    } catch (err) {
      const info = describeStripeError(err);
      console.error('[checkout/intent] stripe failure (sandbox)', { type: info.type, code: info.code, requestId: info.requestId });
      return errorResponse(502, 'payment_init_failed', 'We could not start the payment. Please try again in a moment.');
    }
    if (!intent.client_secret) return errorResponse(502, 'payment_init_failed', 'We could not start the payment. Please try again in a moment.');
    const payload: CreatePaymentIntentResponse = {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      orderId: order.id,
      orderKey: order.key,
      amount: totalMinor,
      currency: 'gbp',
    };
    const res = NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
    writeDemoOrder(req, res, { ...order, intentId: intent.id });
    return res;
  }

  // Demo mode: a pretend order in a signed cookie; the client "pays" via POST /api/checkout/demo. Nothing is charged
  // and nothing reaches WooCommerce or Stripe.
  if (demo) {
    const order = newDemoOrder(totalMinor, body.billing.email ?? '', body.customerNote);
    const payload: CreatePaymentIntentResponse = {
      clientSecret: `demo_${order.key}_secret`,
      paymentIntentId: `pi_demo_${order.id}`,
      orderId: order.id,
      orderKey: order.key,
      amount: totalMinor,
      currency: 'gbp',
    };
    const res = NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
    writeDemoOrder(req, res, order);
    return res;
  }

  // 2. WooCommerce order (reuse or create)
  let order: WooRestOrder;
  try {
    order =
      (await findReusableOrder(req, cart, hash, body)) ??
      (await createOrder({ cart, billing: body.billing, shipping: body.shipping, customerNote: body.customerNote, cartHash: hash }));
  } catch (err) {
    logWcError('create order', err);
    return errorResponse(502, 'order_create_failed', 'We could not start your order. Please try again in a moment.');
  }

  if (orderTotalMinor(order, cart) !== totalMinor) {
    console.error('[checkout/intent] order total mismatch', { orderId: order.id, orderTotal: order.total, cartTotal: cart.totals.total_price });
    try {
      await updateOrder(order.id, { status: 'cancelled' });
      await addOrderNote(order.id, `Cancelled by headless checkout: WooCommerce total ${order.total} did not match the basket total ${cart.totals.total_price} (minor units). No payment was taken.`);
    } catch (err) {
      logWcError('cancel mismatched order', err);
    }
    return errorResponse(502, 'order_total_mismatch', 'We could not confirm your order total. Please try again or contact us.');
  }

  // 3. Stripe PaymentIntent (reuse the order's intent when it is still payable)
  const stripe = getStripe();
  const metadata: Stripe.MetadataParam = { wc_order_id: String(order.id), wc_order_key: order.order_key, cart_hash: hash };
  let intent: Stripe.PaymentIntent | null = null;
  try {
    const existingId = orderMeta(order, STRIPE_INTENT_META);
    if (existingId) {
      const existing = await stripe.paymentIntents.retrieve(existingId);
      if (existing.status === 'succeeded') return errorResponse(409, 'already_paid', 'This order has already been paid.');
      if (existing.status === 'processing') return errorResponse(409, 'payment_processing', 'A payment for this order is already being processed.');
      if (existing.status !== 'canceled') {
        intent =
          existing.amount === totalMinor && existing.metadata.cart_hash === hash
            ? existing
            : await stripe.paymentIntents.update(existingId, { amount: totalMinor, metadata, shipping: toStripeShipping(body.shipping) });
      }
    }
    if (!intent) {
      intent = await stripe.paymentIntents.create(
        {
          amount: totalMinor,
          currency: 'gbp',
          automatic_payment_methods: { enabled: true },
          metadata,
          description: `WD Locks order #${order.number}`,
          ...(body.billing.email ? { receipt_email: body.billing.email } : {}),
          shipping: toStripeShipping(body.shipping),
        },
        { idempotencyKey: `wc-order-${order.id}-${totalMinor}` },
      );
    }
  } catch (err) {
    const info = describeStripeError(err);
    console.error('[checkout/intent] stripe failure', { orderId: order.id, type: info.type, code: info.code, requestId: info.requestId });
    return errorResponse(502, 'payment_init_failed', 'We could not start the payment. Please try again in a moment.');
  }

  if (!intent.client_secret) {
    console.error('[checkout/intent] intent without client_secret', { orderId: order.id, intentId: intent.id });
    return errorResponse(502, 'payment_init_failed', 'We could not start the payment. Please try again in a moment.');
  }

  if (orderMeta(order, STRIPE_INTENT_META) !== intent.id) {
    try {
      await updateOrder(order.id, { transaction_id: intent.id, meta_data: [{ key: STRIPE_INTENT_META, value: intent.id }] });
    } catch (err) {
      // The webhook still finds the order via metadata.wc_order_id; log and carry on.
      logWcError('store intent id', err);
    }
  }

  const payload: CreatePaymentIntentResponse = {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    orderId: order.id,
    orderKey: order.order_key,
    amount: totalMinor,
    currency: 'gbp',
  };
  const res = NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
  res.cookies.set(CHECKOUT_ORDER_COOKIE, `${order.id}:${order.order_key}:${hash}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: CHECKOUT_ORDER_COOKIE_TTL,
  });
  return res;
}

function logWcError(step: string, err: unknown): void {
  if (err instanceof WcRestError) {
    console.error(`[checkout/intent] woo ${step} failed`, { status: err.status, code: err.code, message: err.message });
  } else {
    console.error(`[checkout/intent] woo ${step} failed`, err instanceof Error ? err.message : 'unknown error');
  }
}
