/**
 * Client-side checkout helpers. The basket itself never leaves the browser (src/lib/basket.ts, useCart); these call
 * OUR /api/checkout/* routes, which price the basket from the Store API and talk to WooCommerce REST + Stripe. There
 * is no cart proxy any more: wdlocks.co.uk is touched once, at "Place order".
 */
import type { WooStoreError, CreatePaymentIntentRequest, CreatePaymentIntentResponse, CheckoutStatusResponse } from '@/types';
export class CartClientError extends Error {
  readonly status: number;
  readonly code: string;
  /** The error envelope's `data` (e.g. the server's prices on a 409 total_mismatch). */
  readonly data: Record<string, unknown> | undefined;
  constructor(status: number, code: string, message: string, data?: Record<string, unknown>) {
    super(message);
    this.name = 'CartClientError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  woocommerce_rest_product_out_of_stock: 'Sorry, that item is out of stock.',
  woocommerce_rest_product_partially_out_of_stock: 'Not enough stock for that quantity.',
  woocommerce_rest_cart_invalid_product: 'That product is no longer available.',
  woocommerce_rest_variation_not_found: 'That size is no longer available.',
  unknown_product: 'That product is no longer available.',
  upstream_unavailable: 'Our store is temporarily unavailable. Please try again in a moment.',
  invalid_request: 'Something was wrong with that request.',
  empty_cart: 'Your basket is empty.',
  shipping_required: 'Choose a delivery option before paying.',
  total_mismatch: 'Prices have changed since you added these items. Your basket has been updated — please check it and try again.',
  order_create_failed: 'We could not start your order. Please try again in a moment.',
  order_total_mismatch: 'We could not confirm your order total. Please try again or call us.',
  payment_init_failed: 'We could not start the payment. Please try again in a moment.',
  'not-configured': 'Card payment on this site is not switched on yet.',
};

export function friendlyCartError(err: unknown): string {
  if (err instanceof CartClientError) {
    return FRIENDLY_MESSAGES[err.code] ?? err.message ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

async function checkoutRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/checkout${path}`, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
      cache: 'no-store',
    });
  } catch {
    throw new CartClientError(0, 'network_error', 'Network error — check your connection.');
  }
  if (!res.ok) {
    let body: Partial<WooStoreError> = {};
    try {
      body = (await res.json()) as WooStoreError;
    } catch {
      /* ignore */
    }
    throw new CartClientError(res.status, body.code ?? 'unknown_error', body.message ?? res.statusText, body.data);
  }
  return (await res.json()) as T;
}

/** Creates the pending WooCommerce order and the Stripe PaymentIntent. 503 `not-configured` when Stripe keys are missing. */
export function createPaymentIntent(body: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
  return checkoutRequest<CreatePaymentIntentResponse>('/intent', { method: 'POST', body: JSON.stringify(body) });
}

export function getCheckoutStatus(orderId: number, orderKey: string): Promise<CheckoutStatusResponse> {
  const q = new URLSearchParams({ order: String(orderId), key: orderKey });
  return checkoutRequest<CheckoutStatusResponse>(`/status?${q.toString()}`, { method: 'GET' });
}

/** Demo mode only: pretend to pay. 200 = paid, 402 = declined (demo). */
export function confirmDemoPayment(body: { orderId: number; orderKey: string; outcome: 'succeeded' | 'declined' | 'requires_action'; method: string }): Promise<CheckoutStatusResponse> {
  return checkoutRequest<CheckoutStatusResponse>('/demo', { method: 'POST', body: JSON.stringify(body) });
}
