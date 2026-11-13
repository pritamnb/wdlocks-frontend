/**
 * WD Locks — WooCommerce Store API v1 client (product reads + money helpers).
 *
 * Product endpoints are public and CORS-safe, so these helpers work in both
 * server and client components. Cart mutations are NOT here: they must go
 * through the /api/cart/* proxy routes (see cart-client.ts and cart-proxy.ts),
 * because wdlocks.co.uk does not send Access-Control-Allow-Origin for our domain.
 */
import { STORE_API, CATALOGUE_BY_SLUG, CATALOGUE } from '@/lib/constants';
import type { WooProduct, WooCategory, WooStoreError } from '@/types';

export class StoreApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'StoreApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<StoreApiError> {
  let body: Partial<WooStoreError> = {};
  try {
    body = (await res.json()) as WooStoreError;
  } catch {
    /* non-JSON upstream error */
  }
  return new StoreApiError(
    res.status,
    body.code ?? 'upstream_error',
    body.message ?? `Store API responded with ${res.status}`,
  );
}

/** Upstream answers worth a second try: the host's rate limiter (429) and gateway/overload errors. */
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
/** Back-off before attempt 2 and 3 (ms); a Retry-After header wins when the host sends one (capped at 10 s). */
const RETRY_DELAYS_MS = [1000, 3000];

function retryDelay(res: Response | null, attempt: number): number {
  const header = res?.headers.get('retry-after');
  const seconds = header ? Number.parseFloat(header) : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 10_000);
  return RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
}

/**
 * GET helper with a short retry: wdlocks.co.uk's shared host rate-limits bursts (a build prerendering nine product
 * pages after a run of deploys got a 429 on 13 Nov and the whole deploy failed), and a network blip or 502 from the
 * CDN front is just as transient. Non-retryable statuses (404, 400…) throw at once.
 */
export async function storeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: StoreApiError | Error | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(`${STORE_API}${path}`, {
        ...init,
        headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (res) {
      if (res.ok) return (await res.json()) as T;
      lastError = await parseError(res);
      if (!RETRYABLE_STATUS.has(res.status)) throw lastError;
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      const wait = retryDelay(res, attempt);
      console.warn(`[store-api] ${path} → ${res ? res.status : 'network error'}; retrying in ${wait} ms (attempt ${attempt + 2})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError ?? new StoreApiError(0, 'upstream_error', 'Store API unreachable');
}

/* ---------------------------------------------------------------------------
 * Products
 * ------------------------------------------------------------------------- */

export interface ProductQuery {
  perPage?: number;
  page?: number;
  category?: number;
  search?: string;
  orderby?: 'date' | 'price' | 'popularity' | 'rating' | 'title';
  order?: 'asc' | 'desc';
}

export function buildProductQuery(q: ProductQuery = {}): string {
  const params = new URLSearchParams();
  params.set('per_page', String(q.perPage ?? 20));
  if (q.page) params.set('page', String(q.page));
  if (q.category) params.set('category', String(q.category));
  if (q.search) params.set('search', q.search);
  if (q.orderby) params.set('orderby', q.orderby);
  if (q.order) params.set('order', q.order);
  return params.toString();
}

export function getProducts(q: ProductQuery = {}, init?: RequestInit): Promise<WooProduct[]> {
  return storeFetch<WooProduct[]>(`/products?${buildProductQuery(q)}`, init);
}

export function getProduct(id: number, init?: RequestInit): Promise<WooProduct> {
  return storeFetch<WooProduct>(`/products/${id}`, init);
}

/** Resolves a slug via our static catalogue first (one request), falling back to a slug query. */
export async function getProductBySlug(slug: string, init?: RequestInit): Promise<WooProduct | null> {
  const entry = CATALOGUE_BY_SLUG[slug];
  if (entry) return getProduct(entry.id, init);
  const results = await storeFetch<WooProduct[]>(
    `/products?slug=${encodeURIComponent(slug)}`,
    init,
  );
  return results[0] ?? null;
}

/** Fetches all 9 catalogue products by ID, preserving catalogue order. */
export async function getCatalogueProducts(init?: RequestInit): Promise<WooProduct[]> {
  const ids = CATALOGUE.map((p) => p.id).join(',');
  const products = await storeFetch<WooProduct[]>(
    `/products?include=${ids}&per_page=${CATALOGUE.length}`,
    init,
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  return CATALOGUE.map((p) => byId.get(p.id)).filter((p): p is WooProduct => Boolean(p));
}

export function getCategories(init?: RequestInit): Promise<WooCategory[]> {
  return storeFetch<WooCategory[]>('/products/categories', init);
}

/* ---------------------------------------------------------------------------
 * Money
 * ------------------------------------------------------------------------- */

/**
 * Formats a Store API minor-unit price ("3499" or 3499 → "£34.99").
 * Always uses 2 decimals for GBP; the Store API returns currency_minor_unit = 2.
 */
export function formatPrice(
  pence: string | number | null | undefined,
  opts: { minorUnit?: number; prefix?: string; suffix?: string } = {},
): string {
  const { minorUnit = 2, prefix = '£', suffix = '' } = opts;
  const n = typeof pence === 'string' ? Number.parseInt(pence, 10) : pence ?? 0;
  if (!Number.isFinite(n)) return `${prefix}0.00${suffix}`;
  const major = n / 10 ** minorUnit;
  return `${prefix}${major.toLocaleString('en-GB', {
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
  })}${suffix}`;
}

/** Sums minor-unit strings safely (Store API totals are strings). */
export function sumPence(...values: Array<string | number | null | undefined>): number {
  return values.reduce<number>((acc, v) => {
    const n = typeof v === 'string' ? Number.parseInt(v, 10) : v ?? 0;
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** Display price for a product: single price or "From £X" for ranged variables. */
export function productPriceLabel(product: WooProduct): string {
  const { prices } = product;
  if (prices.price_range) {
    const min = formatPrice(prices.price_range.min_amount, { minorUnit: prices.currency_minor_unit });
    const max = formatPrice(prices.price_range.max_amount, { minorUnit: prices.currency_minor_unit });
    return min === max ? min : `${min} – ${max}`;
  }
  return formatPrice(prices.price, { minorUnit: prices.currency_minor_unit });
}

/* ---------------------------------------------------------------------------
 * Misc helpers
 * ------------------------------------------------------------------------- */

/** Strips HTML tags and decodes common entities for use in meta descriptions and plain text. */
export function stripHtml(html: string, maxLength?: number): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLength && text.length > maxLength) return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  return text;
}

/** Decodes the handful of HTML entities WooCommerce puts in product names. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"');
}
