import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { errorResponse, isSecureRequest, parseAddress, parseBasketItems, readJson } from '@/lib/request-utils';
import { CouponError, normaliseCouponCode } from '@/lib/coupon';
import { cartHash } from '@/lib/checkout-cart-hash';
import type { BasketLineInput } from '@/lib/basket';
import { priceBasket, PricingError, type PricedBasket } from '@/lib/pricing';
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
import { isDemoCheckout, isStripeSandbox, newDemoOrder, writeDemoOrder, type DemoOrder } from '@/lib/demo-checkout';
import type { CheckoutAddressInput, CreatePaymentIntentResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** `${orderId}:${orderKey}:${cartHash}` — lets a retry (back button, second click) reuse the pending order. */
export const CHECKOUT_ORDER_COOKIE = 'wd_checkout_order';
const CHECKOUT_ORDER_COOKIE_TTL = 60 * 60 * 24; // 1 day
const CUSTOMER_NOTE_MAX = 500;
/** Stripe's minimum charge for GBP is 30p. */
const MIN_AMOUNT_MINOR = 30;

const limiter = new RateLimiter(10, 60_000);

interface ValidBody {
  items: BasketLineInput[];
  shippingOptionId: string;
  billing: CheckoutAddressInput;
  shipping: CheckoutAddressInput;
  customerNote: string | undefined;
  expectedTotal: number;
  couponCode: string | undefined;
}

function parseBody(body: Record<string, unknown>): { ok: true; value: ValidBody } | { ok: false; code: string; message: string } {
  const items = parseBasketItems(body.items);
  if (!items) return { ok: false, code: 'empty_cart', message: 'Your basket is empty or contains an item we no longer sell.' };

  // Checked against the store's live rates when the basket is priced (priceBasket).
  if (typeof body.shipping_option !== 'string' || body.shipping_option.length === 0 || body.shipping_option.length > 64) {
    return { ok: false, code: 'shipping_required', message: 'Choose a delivery option before paying.' };
  }

  const billing = parseAddress(body.billing_address);
  if (!billing) return { ok: false, code: 'invalid_request', message: 'Check the billing address: name, address, town, postcode and country are required.' };

  let shipping: CheckoutAddressInput = billing;
  if (body.shipping_address !== undefined && body.shipping_address !== null) {
    const parsed = parseAddress(body.shipping_address);
    if (!parsed) return { ok: false, code: 'invalid_request', message: 'Check the delivery address: name, address, town, postcode and country are required.' };
    shipping = parsed;
  }
  if (shipping.country !== 'GB') return { ok: false, code: 'invalid_request', message: 'We deliver within the UK only.' };

  let customerNote: string | undefined;
  if (body.customer_note !== undefined && body.customer_note !== null) {
    if (typeof body.customer_note !== 'string' || body.customer_note.length > CUSTOMER_NOTE_MAX) {
      return { ok: false, code: 'invalid_request', message: `Order notes must be ${CUSTOMER_NOTE_MAX} characters or fewer.` };
    }
    customerNote = body.customer_note.trim() || undefined;
  }

  if (typeof body.expected_total !== 'string' || !/^\d{1,12}$/.test(body.expected_total)) {
    return { ok: false, code: 'invalid_request', message: 'expected_total must be the basket total in pence.' };
  }

  let couponCode: string | undefined;
  if (body.coupon_code !== undefined && body.coupon_code !== null && body.coupon_code !== '') {
    const code = normaliseCouponCode(body.coupon_code);
    if (!code) return { ok: false, code: 'coupon_invalid', message: 'That promo code is not valid.' };
    couponCode = code;
  }

  return { ok: true, value: { items, shippingOptionId: body.shipping_option, billing, shipping, customerNote, expectedTotal: Number(body.expected_total), couponCode } };
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

function orderTotalMinor(order: WooRestOrder): number {
  return majorToMinor(order.total, 2);
}

/** Reuses the pending order named in the cookie when it still matches this basket; refreshes its addresses. */
async function findReusableOrder(req: Request, basket: PricedBasket, hash: string, body: ValidBody): Promise<WooRestOrder | null> {
  const cookie = readOrderCookie(req);
  if (!cookie || cookie.hash !== hash) return null;
  let order: WooRestOrder;
  try {
    order = await getOrder(cookie.orderId);
  } catch {
    return null;
  }
  if (order.order_key !== cookie.orderKey || order.status !== 'pending') return null;
  if (orderTotalMinor(order) !== basket.totalPence) return null;
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
    phone: address.phone,
    address: {
      line1: address.address_1,
      line2: address.address_2,
      city: address.city,
      state: address.state,
      postal_code: address.postcode,
      country: address.country,
    },
  };
}

/** The priced basket as the demo order remembers it (what a WooCommerce order would carry). */
function demoDetail(basket: PricedBasket): Pick<DemoOrder, 'lines' | 'shipping' | 'tax' | 'coupon'> {
  return {
    lines: basket.lines.map((l) => ({ id: l.id, q: l.quantity, unit: l.unitPence })),
    shipping: { id: basket.shipping.id, pence: basket.shipping.pricePence },
    tax: basket.totalTaxPence,
    ...(basket.coupon ? { coupon: { code: basket.coupon.code, pence: basket.coupon.discountPence } } : {}),
  };
}

/**
 * POST /api/checkout/intent
 * Body: CreatePaymentIntentRequest (ids + quantities, delivery option, addresses, note, promo code, expected_total in pence).
 * The ONE call in the shopping flow that reaches wdlocks.co.uk: prices the basket from the Store API products
 * endpoint (cached a few minutes), then — depending on the rollout stage — writes a pretend order (demo / sandbox) or
 * creates the pending WooCommerce order and the Stripe PaymentIntent.
 * Responses: 200 CreatePaymentIntentResponse · 400 invalid / stock · 404 unknown product · 409 total_mismatch ·
 * 429 · 502 upstream · 503 not-configured.
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
  if (!parsed.ok) return errorResponse(400, parsed.code, parsed.message);
  const body = parsed.value;

  // 1. Price the basket from the live Store API (the only basket truth the server accepts).
  let basket: PricedBasket;
  try {
    basket = await priceBasket(body.items, body.shippingOptionId, body.expectedTotal, body.couponCode);
  } catch (err) {
    // The code stopped applying since the shopper added it (expired, used up): the client drops it and says why.
    if (err instanceof CouponError) {
      if (err.status >= 500) console.error('[checkout/intent] promo code check failed', { code: err.code, message: err.message });
      return errorResponse(err.status, err.code, err.message);
    }
    if (err instanceof PricingError) {
      if (err.status >= 500) console.error('[checkout/intent] pricing failed', { code: err.code, message: err.message });
      return errorResponse(err.status, err.code, err.message);
    }
    console.error('[checkout/intent] pricing failed', err instanceof Error ? err.message : 'unknown error');
    return errorResponse(502, 'upstream_unavailable', 'Could not price your basket. Please try again.');
  }

  const totalMinor = basket.totalPence;
  if (totalMinor < MIN_AMOUNT_MINOR) return errorResponse(400, 'amount_too_small', 'The basket total is too small to pay by card.');
  if (totalMinor !== body.expectedTotal) {
    // The client re-prices from this payload and shows the new total before the shopper tries again.
    return errorResponse(409, 'total_mismatch', 'Prices have changed since you added these items. Please check your basket and try again.', {
      total: String(totalMinor),
      prices: Object.fromEntries(basket.lines.map((l) => [String(l.id), l.unitPence])),
      coupon: basket.coupon,
    });
  }

  const hash = cartHash(basket);
  const shippingOption = basket.shipping;

  // Sandbox stage: a real Stripe PaymentIntent (test mode) for a pretend order held in the signed cookie. The return
  // page reads the intent's outcome through /api/checkout/status; WooCommerce is never touched.
  if (sandbox) {
    const order = newDemoOrder(totalMinor, body.billing.email ?? '', body.customerNote, demoDetail(basket));
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
    const order = newDemoOrder(totalMinor, body.billing.email ?? '', body.customerNote, demoDetail(basket));
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
      (await findReusableOrder(req, basket, hash, body)) ??
      (await createOrder({ basket, billing: body.billing, shipping: body.shipping, customerNote: body.customerNote, cartHash: hash }));
  } catch (err) {
    logWcError('create order', err);
    // WooCommerce re-checks the promo code when it builds the order (per-customer limits need the email); pass its reason on.
    if (err instanceof WcRestError && body.couponCode && /coupon/i.test(err.code)) {
      return errorResponse(400, 'coupon_invalid', err.message.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"') || 'That promo code cannot be used on this order.');
    }
    return errorResponse(502, 'order_create_failed', 'We could not start your order. Please try again in a moment.');
  }

  if (orderTotalMinor(order) !== totalMinor) {
    console.error('[checkout/intent] order total mismatch', { orderId: order.id, orderTotal: order.total, basketTotal: totalMinor });
    try {
      await updateOrder(order.id, { status: 'cancelled' });
      await addOrderNote(order.id, `Cancelled by headless checkout: WooCommerce total ${order.total} did not match the basket total ${totalMinor}p (${shippingOption.methodTitle}). No payment was taken.`);
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
