/**
 * Client-side cart helpers. These call OUR Next.js proxy routes (/api/cart/*),
 * never wdlocks.co.uk directly — the Store API cart endpoints are not CORS-enabled
 * for this domain and the session must be held server-side (see cart-proxy.ts).
 *
 * credentials: 'include' is still required: the proxy keeps the WooCommerce
 * Cart-Token in an httpOnly cookie on our own domain.
 */
import type {
  WooCart,
  WooStoreError,
  AddToCartRequest,
  UpdateCartItemRequest,
  RemoveCartItemRequest,
  UpdateCustomerRequest,
  SelectShippingRateRequest,
  CouponRequest,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  CheckoutStatusResponse,
} from '@/types';

export class CartClientError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'CartClientError';
    this.status = status;
    this.code = code;
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  woocommerce_rest_product_out_of_stock: 'Sorry, that item is out of stock.',
  woocommerce_rest_product_partially_out_of_stock: 'Not enough stock for that quantity.',
  woocommerce_rest_cart_invalid_product: 'That product is no longer available.',
  woocommerce_rest_variation_not_found: 'That size is no longer available.',
  woocommerce_rest_cart_invalid_key: 'That item is no longer in your basket.',
  woocommerce_rest_add_to_cart_error: 'This item needs extra details — please order it on wdlocks.co.uk.',
  woocommerce_rest_invalid_variation_data: 'That option is no longer available.',
  woocommerce_rest_missing_nonce: 'Your session expired. Please try again.',
  unknown_product: 'That product is no longer available.',
  upstream_unavailable: 'Our store is temporarily unavailable. Please try again in a moment.',
  invalid_request: 'Something was wrong with that request.',
  woocommerce_rest_cart_coupon_error: 'That coupon code is not valid.',
  woocommerce_rest_invalid_address: 'Please check the address details.',
  woocommerce_rest_cart_shipping_rate_error: 'That delivery option is not available.',
  total_mismatch: 'Your basket changed while you were checking out. Please review it and try again.',
  'not-configured': 'Card payment on this site is not switched on yet.',
};

export function friendlyCartError(err: unknown): string {
  if (err instanceof CartClientError) {
    return FRIENDLY_MESSAGES[err.code] ?? err.message ?? 'Failed to update your basket.';
  }
  return 'Failed to update your basket.';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/cart${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
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
    throw new CartClientError(res.status, body.code ?? 'unknown_error', body.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

export function fetchCart(): Promise<WooCart> {
  return request<WooCart>('', { method: 'GET' });
}

export function addItem(body: AddToCartRequest): Promise<WooCart> {
  return request<WooCart>('/add', { method: 'POST', body: JSON.stringify(body) });
}

export function updateItem(body: UpdateCartItemRequest): Promise<WooCart> {
  return request<WooCart>('/update', { method: 'PUT', body: JSON.stringify(body) });
}

export function removeItem(body: RemoveCartItemRequest): Promise<WooCart> {
  return request<WooCart>('/remove', { method: 'DELETE', body: JSON.stringify(body) });
}

/** Empties the headless basket (used when handing off to the WooCommerce checkout). */
export function clearCart(): Promise<WooCart> {
  return request<WooCart>('/clear', { method: 'DELETE' });
}

/* ---------------------------------------------------------------------------
 * Checkout on our domain. Cart calls go through /api/cart/* (Store API); the order + payment calls go
 * through /api/checkout/* (WooCommerce REST + Stripe). All of these are implemented server-side in
 * src/app/api/cart/{customer,shipping,coupon}/route.ts and src/app/api/checkout/{intent,status}/route.ts.
 * ------------------------------------------------------------------------- */

/** Saves billing/shipping addresses on the basket; the returned cart carries recalculated shipping rates and totals. */
export function updateCustomer(body: UpdateCustomerRequest): Promise<WooCart> {
  return request<WooCart>('/customer', { method: 'POST', body: JSON.stringify(body) });
}

export function selectShippingRate(body: SelectShippingRateRequest): Promise<WooCart> {
  return request<WooCart>('/shipping', { method: 'POST', body: JSON.stringify(body) });
}

export function applyCoupon(body: CouponRequest): Promise<WooCart> {
  return request<WooCart>('/coupon', { method: 'POST', body: JSON.stringify(body) });
}

export function removeCoupon(body: CouponRequest): Promise<WooCart> {
  return request<WooCart>('/coupon', { method: 'DELETE', body: JSON.stringify(body) });
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
    throw new CartClientError(res.status, body.code ?? 'unknown_error', body.message ?? res.statusText);
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
