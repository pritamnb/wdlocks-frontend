/**
 * Promo codes, checked by WooCommerce itself (server only).
 *
 * The basket lives in the browser, so there is no WooCommerce cart to apply a code to. Instead a throwaway Store API
 * cart is opened (GET /cart hands out a Cart-Token; no keys, no nonce), the basket lines are added and the code is
 * applied, all in one /batch call. WooCommerce runs every coupon rule it has (expiry, minimum spend, products,
 * usage limits) and answers with the discount in pence, or with its own refusal message. It is the same thing the old
 * site does when a visitor types a coupon into its basket; nothing on wdlocks.co.uk is configured or changed, and the
 * throwaway cart expires on its own like any abandoned basket.
 *
 * Timing (14 Nov 2026, from the UK): GET /cart ~0.4 s, the batch ~1.2 s.
 */
import { STORE_API } from '@/lib/constants';
import type { BasketLineInput } from '@/lib/basket';
import type { CouponQuote } from '@/types';

const TIMEOUT_MS = 12_000;
/** WooCommerce coupon codes are free text; we accept what a person could reasonably type. */
const CODE_RE = /^[\p{L}\p{N} ._\-]{1,40}$/u;

export class CouponError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'CouponError';
    this.status = status;
    this.code = code;
  }
}

/** Trimmed, lower-cased code (WooCommerce stores codes lower-case), or null when it cannot be a code. */
export function normaliseCouponCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  return CODE_RE.test(code) ? code : null;
}

/** WooCommerce messages arrive HTML-escaped ("Coupon &quot;x&quot; …"); show them as plain text. */
function decodeEntities(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&pound;/g, '£')
    .trim();
}

async function storeFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${STORE_API}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'User-Agent': 'wdlocks-frontend/1.0 (+promo-code)', ...(init.headers ?? {}) },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    throw new CouponError(502, 'upstream_unavailable', 'We could not check that code just now. Please try again.');
  } finally {
    clearTimeout(timer);
  }
}

interface BatchResponse {
  responses?: Array<{ status: number; body: Record<string, unknown> }>;
}

interface CartBody {
  coupons?: Array<{ code: string; discount_type?: string; totals?: { total_discount?: string; total_discount_tax?: string } }>;
  totals?: { total_discount?: string; total_discount_tax?: string };
}

/**
 * Asks WooCommerce what `code` takes off these lines. Throws CouponError: 400 `coupon_invalid` with WooCommerce's
 * reason when the code does not apply, 502 when the store cannot be reached.
 */
export async function quoteCoupon(items: readonly BasketLineInput[], code: string): Promise<CouponQuote> {
  const open = await storeFetch('/cart', { method: 'GET' });
  const token = open.headers.get('cart-token');
  if (!open.ok || !token) throw new CouponError(502, 'upstream_unavailable', 'We could not check that code just now. Please try again.');

  const requests = [
    ...items.map((i) => ({ path: '/wc/store/v1/cart/add-item', method: 'POST', body: { id: i.id, quantity: i.quantity } })),
    { path: '/wc/store/v1/cart/apply-coupon', method: 'POST', body: { code } },
  ];
  const res = await storeFetch('/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cart-Token': token },
    body: JSON.stringify({ requests }),
  });
  let json: BatchResponse | null = null;
  try {
    json = (await res.json()) as BatchResponse;
  } catch {
    /* host error page */
  }
  const responses = json?.responses;
  if (!responses || responses.length !== requests.length) {
    throw new CouponError(502, 'upstream_unavailable', 'We could not check that code just now. Please try again.');
  }
  // A line WooCommerce would not add (sold out, withdrawn) is a basket problem, not a code problem.
  if (responses.slice(0, items.length).some((r) => r.status >= 300)) {
    throw new CouponError(502, 'upstream_unavailable', 'We could not check that code against your basket. Please try again.');
  }

  const applied = responses[responses.length - 1];
  if (applied.status >= 300) {
    const message = typeof applied.body.message === 'string' ? decodeEntities(applied.body.message) : '';
    throw new CouponError(400, 'coupon_invalid', message || 'That code is not valid.');
  }

  const cart = applied.body as CartBody;
  const coupon = cart.coupons?.find((c) => c.code.toLowerCase() === code) ?? cart.coupons?.[0];
  const exPence = Number.parseInt(coupon?.totals?.total_discount ?? cart.totals?.total_discount ?? '0', 10) || 0;
  const taxPence = Number.parseInt(coupon?.totals?.total_discount_tax ?? cart.totals?.total_discount_tax ?? '0', 10) || 0;
  return {
    code: coupon?.code ?? code,
    discountType: coupon?.discount_type ?? '',
    discountPence: exPence + taxPence,
    discountExPence: exPence,
    discountTaxPence: taxPence,
  };
}
