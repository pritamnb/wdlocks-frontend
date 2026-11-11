/**
 * Server-only helper shared by the /api/cart/* route handlers.
 *
 * WHY A PROXY
 *   wdlocks.co.uk does not send Access-Control-Allow-Origin for this domain, so the
 *   browser cannot call /wc/store/v1/cart/* directly. Also, the WooCommerce session
 *   cookie (wp_woocommerce_session_*) is a third-party cookie from here and would be
 *   dropped by Safari/Chrome anyway.
 *
 * HOW THE SESSION IS KEPT
 *   The Store API supports a "Cart-Token" header (a JWT identifying the cart session).
 *   Every cart response carries a fresh Cart-Token response header. We:
 *     1. read our own httpOnly cookie  (WD_CART_COOKIE)  → send upstream as `Cart-Token`
 *     2. read the upstream `Cart-Token` response header  → store it back in our cookie
 *     3. forward any upstream `Set-Cookie` headers, rewritten to our domain/path, so the
 *        WooCommerce session cookie (when present) also survives between proxy calls.
 *   When a Cart-Token is supplied the Store API does not require a nonce.
 *
 * SSRF
 *   The upstream host is fixed from server config and the path is one of a few literals (CartPath).
 *   Nothing from the request body ever reaches the URL.
 */
import { NextResponse } from 'next/server';
import { STORE_API, PURCHASABLE_IDS, MAX_CART_QUANTITY } from '@/lib/constants';
import type { WooCart, WooStoreError, CheckoutAddressInput } from '@/types';

export const WD_CART_COOKIE = 'wd_cart_token';
/** Readable marker set beside the httpOnly token so the client knows a basket session exists (skips the mount fetch otherwise). */
export const WD_CART_MARKER_COOKIE = 'wd_cart';
/** Upstream cookies we're willing to persist on our domain. */
const FORWARDED_COOKIE_PREFIXES = ['wp_woocommerce_session_', 'woocommerce_items_in_cart', 'woocommerce_cart_hash'];
const CART_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 2; // Store API tokens expire after 48h
const UPSTREAM_TIMEOUT_MS = 10_000;

export type CartPath =
  | '/cart'
  | '/cart/items'
  | '/cart/add-item'
  | '/cart/update-item'
  | '/cart/remove-item'
  | '/cart/update-customer'
  | '/cart/select-shipping-rate'
  | '/cart/apply-coupon'
  | '/cart/remove-coupon';

export interface ProxyResult {
  status: number;
  body: WooCart | WooStoreError;
  cartToken: string | null;
  setCookies: string[];
  /** Milliseconds spent waiting on wdlocks.co.uk (bootstrap GET + the call itself), surfaced as Server-Timing. */
  upstreamMs?: number;
  bootstrapMs?: number;
}

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

/** Builds the Cookie header we send upstream from the cookies the browser sent us. */
function upstreamCookieHeader(req: Request): string | undefined {
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  const pairs = Object.entries(cookies)
    .filter(([name]) => FORWARDED_COOKIE_PREFIXES.some((p) => name.startsWith(p)))
    .map(([name, value]) => `${name}=${value}`);
  return pairs.length ? pairs.join('; ') : undefined;
}

/** Rewrites an upstream Set-Cookie so it is valid for OUR origin (drop Domain, force Path=/, SameSite=Lax). */
function rewriteSetCookie(raw: string, secure: boolean): string | null {
  const [nameValue, ...attrs] = raw.split(';').map((s) => s.trim());
  const name = nameValue.split('=')[0];
  if (!FORWARDED_COOKIE_PREFIXES.some((p) => name.startsWith(p))) return null;
  const kept = attrs.filter((a) => {
    const key = a.split('=')[0].toLowerCase();
    return key === 'expires' || key === 'max-age';
  });
  const parts = [nameValue, ...kept, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  return new URL(req.url).protocol === 'https:';
}

/**
 * Performs the upstream call. Never throws for HTTP errors — returns the upstream status + body
 * so the route can map it. Throws only on network failure/timeout (caller maps to 502).
 */
export async function proxyCartRequest(
  req: Request,
  path: CartPath,
  init: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown },
): Promise<ProxyResult> {
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  let incomingToken: string | undefined = cookies[WD_CART_COOKIE];

  // A mutation without a token would be rejected upstream (401 missing nonce). This happens when the
  // shopper clicks "Add" before the mount-time GET /cart has set our cookie, or has cookies blocked.
  // Bootstrap a session first so the very first click succeeds.
  let bootstrapMs = 0;
  if (!incomingToken && init.method !== 'GET') {
    const t0 = performance.now();
    const bootstrap = await proxyCartRequest(req, '/cart', { method: 'GET' });
    bootstrapMs = Math.round(performance.now() - t0);
    incomingToken = bootstrap.cartToken ?? undefined;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'wdlocks-frontend/1.0 (+cart-proxy)',
  };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (incomingToken) headers['Cart-Token'] = incomingToken; // (1) forward our stored token
  const cookieHeader = upstreamCookieHeader(req);
  if (cookieHeader) headers.Cookie = cookieHeader; //     forward WC session cookies, if any

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res: Response;
  const started = performance.now();
  try {
    res = await fetch(`${STORE_API}${path}`, {
      method: init.method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  let body: WooCart | WooStoreError;
  try {
    const json: unknown = await res.json();
    if (Array.isArray(json)) {
      // DELETE /cart/items answers with an (empty) items array; hand back the real cart instead.
      const refreshed = await proxyCartRequest(req, '/cart', { method: 'GET' });
      return refreshed;
    }
    body = json as WooCart | WooStoreError;
  } catch {
    body = { code: 'upstream_unavailable', message: 'Invalid response from store', data: { status: 502 } };
  }

  // (2) capture the refreshed cart token
  const cartToken = res.headers.get('cart-token');

  // (3) collect upstream Set-Cookie headers (Node 18+/undici exposes getSetCookie)
  const secure = isSecureRequest(req);
  const rawSetCookies: string[] =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : [];
  const setCookies = rawSetCookies
    .map((c) => rewriteSetCookie(c, secure))
    .filter((c): c is string => Boolean(c));

  return { status: res.status, body, cartToken, setCookies, upstreamMs: Math.round(performance.now() - started), bootstrapMs };
}

/** Maps a ProxyResult into the NextResponse we hand to the browser, attaching cookies. */
export function toProxyResponse(req: Request, result: ProxyResult): NextResponse {
  const status = mapStatus(result.status, result.body);
  const res = NextResponse.json(result.body, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      // Visible in DevTools → Timing and via curl: how much of the call was WordPress.
      'Server-Timing': `upstream;dur=${result.upstreamMs ?? 0}${result.bootstrapMs ? `, bootstrap;dur=${result.bootstrapMs}` : ''}`,
    },
  });

  if (result.cartToken) {
    res.cookies.set(WD_CART_COOKIE, result.cartToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureRequest(req),
      path: '/',
      maxAge: CART_TOKEN_TTL_SECONDS,
    });
    res.cookies.set(WD_CART_MARKER_COOKIE, '1', {
      httpOnly: false,
      sameSite: 'lax',
      secure: isSecureRequest(req),
      path: '/',
      maxAge: CART_TOKEN_TTL_SECONDS,
    });
  }
  for (const cookie of result.setCookies) {
    res.headers.append('Set-Cookie', cookie);
  }
  return res;
}

/** Normalises upstream statuses to the contract documented for the client: 400 / 404 / 502. */
function mapStatus(upstream: number, body: WooCart | WooStoreError): number {
  if (upstream >= 200 && upstream < 300) return 200;
  const code = 'code' in body ? body.code : '';
  if (upstream === 404 || code === 'woocommerce_rest_variation_not_found' || code === 'woocommerce_rest_cart_invalid_product') return 404;
  if (upstream >= 500) return 502;
  if (upstream === 401 || upstream === 403) return 502; // our token/nonce problem, not the user's
  return 400;
}

export function errorResponse(status: number, code: string, message: string): NextResponse {
  const body: WooStoreError = { code, message, data: { status } };
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });
}

export function upstreamDownResponse(err: unknown): NextResponse {
  const isAbort = err instanceof Error && err.name === 'AbortError';
  console.error('[cart-proxy] upstream failure', isAbort ? 'timeout' : err);
  return errorResponse(502, 'upstream_unavailable', 'The store is temporarily unavailable. Please try again.');
}

/* ---------------------------------------------------------------------------
 * Input validation
 * ------------------------------------------------------------------------- */

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

/** Cart item keys are 32-char hex MD5s. */
export function parseCartKey(value: unknown): string | null {
  return typeof value === 'string' && /^[a-f0-9]{32}$/i.test(value) ? value.toLowerCase() : null;
}

/** Optional variation attribute map: [{ attribute: 'pa_locksize', value: '35-inside-35-outside' }]. */
export function parseVariation(value: unknown): Array<{ attribute: string; value: string }> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 10) return undefined;
  const out: Array<{ attribute: string; value: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return undefined;
    const { attribute, value: v } = item as Record<string, unknown>;
    if (typeof attribute !== 'string' || typeof v !== 'string') return undefined;
    if (!/^[a-z0-9_-]{1,64}$/i.test(attribute) || v.length > 128) return undefined;
    out.push({ attribute, value: v });
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Checkout input validation (addresses, shipping rates, coupons)
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

/** Store API shipping rate ids look like "flat_rate:2" / "free_shipping:1" / "local_pickup:3". */
export function parseRateId(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z_]+:\d+$/.test(value) ? value : null;
}

/** Coupon codes: 1–32 chars of letters, digits, underscore or hyphen (WooCommerce lower-cases them itself). */
export function parseCouponCode(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(value) ? value : null;
}

/** Shipping package ids are small non-negative integers (0 for the default package). */
export function parsePackageId(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 99) return null;
  return n;
}
