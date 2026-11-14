/**
 * Shared request helpers for the /api/checkout/* route handlers: JSON body reading, the error envelope, and the
 * input validators for ids, quantities and addresses. (These used to live in the Store API cart proxy, which the
 * client-held basket made redundant.)
 */
import { NextResponse } from 'next/server';
import { PURCHASABLE_IDS, MAX_CART_QUANTITY, EXTERNAL_ONLY_PRODUCT_IDS } from '@/lib/constants';
import { MAX_BASKET_LINES, type BasketLineInput } from '@/lib/basket';
import type { WooStoreError, CheckoutAddressInput } from '@/types';

export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  return new URL(req.url).protocol === 'https:';
}

export function errorResponse(status: number, code: string, message: string, extra?: Record<string, unknown>): NextResponse {
  const body: WooStoreError = { code, message, data: { status, ...(extra ?? {}) } };
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await req.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function parseQuantity(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_CART_QUANTITY) return null;
  return n;
}

/** Product/variation ID must be a positive int AND one we sell (allow-list defeats enumeration). */
export function parseProductId(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) return null;
  if (!PURCHASABLE_IDS.has(n)) return null;
  return n;
}

/* ---------------------------------------------------------------------------
 * Checkout address validation
 * ------------------------------------------------------------------------- */

const ADDRESS_FIELD_MAX = 100;
const POSTCODE_MAX = 12;
const PHONE_MAX = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns a trimmed single-line string (CR/LF collapsed) or null when the value is not a string / too long. */
function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const v = value.replace(/[\r\n\t]+/g, ' ').trim();
  return v.length > max ? null : v;
}

/**
 * Validates a checkout address (billing or shipping). Strings only, trimmed, bounded.
 * Required: first_name, last_name, address_1, city, postcode, country (ISO 3166-1 alpha-2, upper-cased).
 * Optional keys are omitted from the result when empty; any present-but-invalid value makes the whole address invalid.
 */
export function parseAddress(value: unknown): CheckoutAddressInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  const required = (key: keyof CheckoutAddressInput, max = ADDRESS_FIELD_MAX): string | null => {
    const v = cleanString(raw[key], max);
    return v ? v : null;
  };
  const optional = (key: keyof CheckoutAddressInput, max = ADDRESS_FIELD_MAX): string | undefined | false => {
    if (raw[key] === undefined || raw[key] === null) return undefined;
    const v = cleanString(raw[key], max);
    if (v === null) return false;
    return v === '' ? undefined : v;
  };

  const first_name = required('first_name');
  const last_name = required('last_name');
  const address_1 = required('address_1');
  const city = required('city');
  const postcode = required('postcode', POSTCODE_MAX);
  const countryRaw = required('country', 2);
  if (!first_name || !last_name || !address_1 || !city || !postcode || !countryRaw) return null;
  const country = countryRaw.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return null;

  const company = optional('company');
  const address_2 = optional('address_2');
  const state = optional('state');
  const phone = optional('phone', PHONE_MAX);
  const email = optional('email');
  if (company === false || address_2 === false || state === false || phone === false || email === false) return null;
  if (email !== undefined && !EMAIL_RE.test(email)) return null;

  const out: CheckoutAddressInput = { first_name, last_name, address_1, city, postcode, country };
  if (company !== undefined) out.company = company;
  if (address_2 !== undefined) out.address_2 = address_2;
  if (state !== undefined) out.state = state;
  if (phone !== undefined) out.phone = phone;
  if (email !== undefined) out.email = email;
  return out;
}

/** Basket lines from the browser: allow-listed ids, 1–99 each, at most MAX_BASKET_LINES, duplicates merged. */
export function parseBasketItems(value: unknown): BasketLineInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_BASKET_LINES) return null;
  const byId = new Map<number, number>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null;
    const { id, quantity } = raw as Record<string, unknown>;
    const pid = parseProductId(id);
    const qty = parseQuantity(quantity);
    // 4266 (3 Star extra keys) needs the key number WooCommerce collects on its own product page; it is never sold here.
    if (pid === null || EXTERNAL_ONLY_PRODUCT_IDS.has(pid) || qty === null || qty < 1) return null;
    byId.set(pid, Math.min(99, (byId.get(pid) ?? 0) + qty));
  }
  return Array.from(byId, ([id, quantity]) => ({ id, quantity }));
}
