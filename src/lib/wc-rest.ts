/**
 * Server-only WooCommerce REST API v3 client (orders). Used by the checkout-on-our-domain flow to create
 * the pending order before the Stripe PaymentIntent and to mark it paid from the webhook.
 *
 * Auth: HTTP Basic with the Read/Write consumer key/secret over HTTPS (WooCommerce → Settings → Advanced
 * → REST API). Secrets are read via server-env.ts only and never logged. Timeouts: 15 s.
 *
 * Pricing is never computed here: line items carry only product/variation id + quantity and WooCommerce prices them
 * itself; the intent route then compares the REST order total with its own Store API pricing (src/lib/pricing.ts).
 */
import { WC_BASE } from '@/lib/constants';
import { readServerEnv } from '@/lib/server-env';
import type { PricedBasket } from '@/lib/pricing';
import type { CheckoutAddressInput, CheckoutOrderStatus } from '@/types';

const WC_REST = `${WC_BASE}/wp-json/wc/v3`;
const TIMEOUT_MS = 15_000;
const PAID_STATUSES: ReadonlySet<string> = new Set(['processing', 'completed']);
const KNOWN_STATUSES: ReadonlySet<CheckoutOrderStatus> = new Set<CheckoutOrderStatus>([
  'pending', 'processing', 'on-hold', 'completed', 'failed', 'cancelled', 'refunded',
]);

/* ---------------------------------------------------------------------------
 * Types (minimal — only what the checkout reads or writes)
 * ------------------------------------------------------------------------- */

export interface WooRestAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
}

export interface WooRestBillingAddress extends WooRestAddress {
  email: string;
}

export interface WooRestMeta {
  id?: number;
  key: string;
  value: unknown;
}

export interface WooRestLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  total: string;
}

export interface WooRestShippingLine {
  id: number;
  method_id: string;
  instance_id: string;
  method_title: string;
  total: string;
  total_tax: string;
}

export interface WooRestOrder {
  id: number;
  /** Display number (may differ from id when a sequential-order-number plugin is installed). */
  number: string;
  order_key: string;
  status: string;
  currency: string;
  total: string;
  total_tax: string;
  date_created: string;
  date_paid: string | null;
  transaction_id: string;
  payment_method: string;
  payment_method_title: string;
  created_via: string;
  customer_note: string;
  billing: WooRestBillingAddress;
  shipping: WooRestAddress;
  line_items: WooRestLineItem[];
  shipping_lines: WooRestShippingLine[];
  coupon_lines: Array<{ id: number; code: string }>;
  meta_data: WooRestMeta[];
}

export interface WooRestOrderNote {
  id: number;
  note: string;
  customer_note: boolean;
}

interface LineItemInput {
  product_id: number;
  variation_id?: number;
  quantity: number;
}

interface ShippingLineInput {
  method_id: string;
  /** WooCommerce's REST schema declares instance_id as a string. */
  instance_id: string;
  method_title: string;
  /** Major units, excluding tax — WooCommerce recalculates shipping tax itself on save. */
  total: string;
}

/** Fields we are willing to PUT on an existing order. */
export interface WooRestOrderPatch {
  status?: CheckoutOrderStatus;
  set_paid?: boolean;
  transaction_id?: string;
  customer_note?: string;
  billing?: WooRestBillingAddress;
  shipping?: WooRestAddress;
  meta_data?: Array<{ key: string; value: string }>;
}

export interface CreateOrderInput {
  basket: PricedBasket;
  billing: CheckoutAddressInput;
  shipping: CheckoutAddressInput;
  customerNote?: string;
  cartHash: string;
}

export class WcRestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'WcRestError';
    this.status = status;
    this.code = code;
  }
}

/* ---------------------------------------------------------------------------
 * Transport
 * ------------------------------------------------------------------------- */

export function isWcRestConfigured(): boolean {
  const env = readServerEnv();
  return Boolean(env.wcConsumerKey && env.wcConsumerSecret) && WC_BASE.startsWith('https://');
}

function authHeader(): string {
  const env = readServerEnv();
  if (!env.wcConsumerKey || !env.wcConsumerSecret) {
    throw new WcRestError(503, 'not-configured', 'WooCommerce REST API credentials are not configured.');
  }
  return `Basic ${Buffer.from(`${env.wcConsumerKey}:${env.wcConsumerSecret}`, 'utf8').toString('base64')}`;
}

async function wcFetch<T>(path: string, init: { method: 'GET' | 'POST' | 'PUT'; body?: unknown }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${WC_REST}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        Authorization: authHeader(),
        'User-Agent': 'wdlocks-frontend/1.0 (+wc-rest)',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new WcRestError(504, isAbort ? 'wc_timeout' : 'wc_network_error', isAbort ? 'WooCommerce did not respond in time.' : 'Could not reach WooCommerce.');
  } finally {
    clearTimeout(timer);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body (e.g. host error page) */
  }

  if (!res.ok) {
    const err = (json && typeof json === 'object' ? json : {}) as { code?: unknown; message?: unknown };
    const code = typeof err.code === 'string' ? err.code : 'wc_rest_error';
    const message = typeof err.message === 'string' ? err.message : `WooCommerce REST responded with ${res.status}`;
    throw new WcRestError(res.status, code, message);
  }
  if (json === null || typeof json !== 'object') {
    throw new WcRestError(502, 'wc_invalid_response', 'Invalid response from WooCommerce.');
  }
  return json as T;
}

/* ---------------------------------------------------------------------------
 * Mapping helpers (Store API cart → REST order payload)
 * ------------------------------------------------------------------------- */

/** Priced basket line → REST line item. Variations carry the parent as product_id and the variation id separately. */
export function toLineItem(line: PricedBasket['lines'][number]): LineItemInput {
  return line.variationId ? { product_id: line.productId, variation_id: line.variationId, quantity: line.quantity } : { product_id: line.productId, quantity: line.quantity };
}

/** "1999" with minor unit 2 → "19.99". */
export function minorToMajor(minor: string | number, minorUnit: number): string {
  const n = Number(minor);
  if (!Number.isFinite(n)) return (0).toFixed(minorUnit);
  return (n / 10 ** minorUnit).toFixed(minorUnit);
}

/** "19.99" with minor unit 2 → 1999 (rounded, so "19.990000001" style floats do not bite). */
export function majorToMinor(major: string | number, minorUnit: number): number {
  const n = Number(major);
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 10 ** minorUnit);
}

/** The chosen delivery option → the one REST shipping line (ex-VAT total; WooCommerce adds the shipping tax itself). */
export function toShippingLines(basket: PricedBasket): ShippingLineInput[] {
  const o = basket.shipping;
  return [{ method_id: o.methodId, instance_id: String(o.instanceId), method_title: o.methodTitle, total: minorToMajor(o.exVatPence, 2) }];
}

function toRestAddress(a: CheckoutAddressInput): WooRestAddress {
  return {
    first_name: a.first_name,
    last_name: a.last_name,
    company: a.company ?? '',
    address_1: a.address_1,
    address_2: a.address_2 ?? '',
    city: a.city,
    state: a.state ?? '',
    postcode: a.postcode,
    country: a.country,
    phone: a.phone ?? '',
  };
}

export function toRestBillingAddress(a: CheckoutAddressInput): WooRestBillingAddress {
  return { ...toRestAddress(a), email: a.email ?? '' };
}

export function toRestShippingAddress(a: CheckoutAddressInput): WooRestAddress {
  return toRestAddress(a);
}

export function orderMeta(order: WooRestOrder, key: string): string | undefined {
  const found = order.meta_data.find((m) => m.key === key);
  return found && typeof found.value === 'string' && found.value ? found.value : undefined;
}

export function isOrderPaid(order: WooRestOrder): boolean {
  return PAID_STATUSES.has(order.status) || Boolean(order.date_paid);
}

export function toCheckoutStatus(status: string): CheckoutOrderStatus {
  return (KNOWN_STATUSES as ReadonlySet<string>).has(status) ? (status as CheckoutOrderStatus) : 'unknown';
}

/* ---------------------------------------------------------------------------
 * Orders
 * ------------------------------------------------------------------------- */

export const HEADLESS_SITE_META = '_headless_site';
export const HEADLESS_CART_HASH_META = '_headless_cart_hash';
export const STRIPE_INTENT_META = '_stripe_intent_id';

/**
 * Creates a pending, unpaid order for the priced basket. Note: WooCommerce overwrites `created_via` with "rest-api"
 * for REST-created orders, so headless orders are identified by the `_headless_site` meta.
 */
export function createOrder(input: CreateOrderInput): Promise<WooRestOrder> {
  const { basket } = input;
  return wcFetch<WooRestOrder>('/orders', {
    method: 'POST',
    body: {
      status: 'pending',
      set_paid: false,
      payment_method: 'stripe',
      payment_method_title: 'Card / wallet (Stripe)',
      created_via: 'headless',
      currency: 'GBP',
      billing: toRestBillingAddress(input.billing),
      shipping: toRestShippingAddress(input.shipping),
      line_items: basket.lines.map(toLineItem),
      shipping_lines: toShippingLines(basket),
      customer_note: input.customerNote ?? '',
      meta_data: [
        { key: HEADLESS_CART_HASH_META, value: input.cartHash },
        { key: HEADLESS_SITE_META, value: 'wdlocks-frontend' },
      ],
    },
  });
}

export function getOrder(id: number): Promise<WooRestOrder> {
  return wcFetch<WooRestOrder>(`/orders/${id}`, { method: 'GET' });
}

export function updateOrder(id: number, patch: WooRestOrderPatch): Promise<WooRestOrder> {
  return wcFetch<WooRestOrder>(`/orders/${id}`, { method: 'PUT', body: patch });
}

/** set_paid makes WooCommerce record date_paid, move to processing and reduce stock. */
export function markOrderPaid(id: number, transactionId: string): Promise<WooRestOrder> {
  return updateOrder(id, { set_paid: true, transaction_id: transactionId, status: 'processing' });
}

/** Private (staff-only) order note. */
export function addOrderNote(id: number, note: string): Promise<WooRestOrderNote> {
  return wcFetch<WooRestOrderNote>(`/orders/${id}/notes`, {
    method: 'POST',
    body: { note: note.slice(0, 2000), customer_note: false },
  });
}
