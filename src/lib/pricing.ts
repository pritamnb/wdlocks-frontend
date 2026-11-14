/**
 * Server-side re-pricing of the client-held basket (src/lib/basket.ts) at "Place order".
 *
 * The browser sends ids and quantities; nothing else it says about money is trusted. Every line is priced from the
 * Store API products endpoint (public, read-only, inc-VAT pence), stock is checked from the same payload, delivery is
 * the chosen SHIPPING_OPTIONS rate, and the total must equal the `expected_total` the shopper saw. The products
 * endpoint answers in 1.1–1.6 s, so prices are cached per id for a few minutes (module memo + Next's data cache).
 */
import { STORE_API, MAX_CART_QUANTITY } from '@/lib/constants';
import { parentProductIdOf, shippingOptionById, splitVat, type BasketLineInput } from '@/lib/basket';
import type { ShippingOption } from '@/lib/constants';
import { quoteCoupon } from '@/lib/coupon';
import type { CouponQuote, WooProduct } from '@/types';

export const PRICE_CACHE_SECONDS = 300;
const UPSTREAM_TIMEOUT_MS = 12_000;

export interface PricedLine {
  id: number;
  /** Parent product id for variations, the product id itself for simple products. */
  productId: number;
  variationId: number | null;
  quantity: number;
  name: string;
  /** Inc-VAT unit price in pence from the Store API. */
  unitPence: number;
  /** Line totals in pence: inc-VAT, and the WooCommerce-style ex/tax split. */
  linePence: number;
  lineExPence: number;
  lineTaxPence: number;
}

export interface PricedBasket {
  lines: PricedLine[];
  shipping: ShippingOption;
  /** Pence. */
  itemsPence: number;
  itemsExPence: number;
  itemsTaxPence: number;
  totalTaxPence: number;
  totalPence: number;
  /** Promo code WooCommerce accepted for these lines (its inc-VAT discount is already taken off the totals). */
  coupon: CouponQuote | null;
}

export class PricingError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'PricingError';
    this.status = status;
    this.code = code;
  }
}

interface CacheEntry {
  product: WooProduct;
  expiresAt: number;
}

/** Per-instance memo; Vercel keeps a warm function around for minutes, which is exactly the window we want. */
const cache = new Map<number, CacheEntry>();

async function storeFetchProducts(query: string): Promise<WooProduct[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(`${STORE_API}/products?${query}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'wdlocks-frontend/1.0 (+pricing)' },
      next: { revalidate: PRICE_CACHE_SECONDS },
      signal: controller.signal,
    });
    if (!res.ok) throw new PricingError(502, 'upstream_unavailable', `Store API responded with ${res.status}`);
    const json: unknown = await res.json();
    if (!Array.isArray(json)) throw new PricingError(502, 'upstream_unavailable', 'Invalid response from the store.');
    return json as WooProduct[];
  } catch (err) {
    if (err instanceof PricingError) throw err;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new PricingError(502, 'upstream_unavailable', isAbort ? 'The store did not respond in time.' : 'Could not reach the store.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Store API products for the given ids (simple products and variations). The list endpoint only returns variations
 * when asked for `type=variation`, so the ids are split into two parallel calls. Results are memoised for
 * PRICE_CACHE_SECONDS; `force` bypasses the memo (used once when a price check fails, so a stale cache can never
 * reject a correct basket).
 */
export async function getProductsForIds(ids: readonly number[], force = false): Promise<Map<number, WooProduct>> {
  const now = Date.now();
  const out = new Map<number, WooProduct>();
  const missing: number[] = [];
  for (const id of new Set(ids)) {
    const hit = cache.get(id);
    if (!force && hit && hit.expiresAt > now) out.set(id, hit.product);
    else missing.push(id);
  }
  if (missing.length > 0) {
    const simple = missing.filter((id) => parentProductIdOf(id) === null);
    const variations = missing.filter((id) => parentProductIdOf(id) !== null);
    const calls: Promise<WooProduct[]>[] = [];
    if (simple.length) calls.push(storeFetchProducts(`include=${simple.join(',')}&per_page=${simple.length}`));
    if (variations.length) calls.push(storeFetchProducts(`include=${variations.join(',')}&type=variation&per_page=${variations.length}`));
    const results = await Promise.all(calls);
    const expiresAt = Date.now() + PRICE_CACHE_SECONDS * 1000;
    for (const product of results.flat()) {
      cache.set(product.id, { product, expiresAt });
      out.set(product.id, product);
    }
  }
  return out;
}

function priceLine(input: BasketLineInput, product: WooProduct | undefined): PricedLine {
  if (!product) throw new PricingError(404, 'unknown_product', 'One of the items in your basket is no longer sold.');
  if (!product.is_purchasable) throw new PricingError(400, 'woocommerce_rest_cart_invalid_product', `${product.name} is no longer available.`);
  if (!product.is_in_stock) throw new PricingError(400, 'woocommerce_rest_product_out_of_stock', `${product.name} is out of stock.`);
  const max = Math.min(product.add_to_cart?.maximum || MAX_CART_QUANTITY, MAX_CART_QUANTITY);
  if (input.quantity > max || (product.low_stock_remaining !== null && input.quantity > product.low_stock_remaining)) {
    throw new PricingError(400, 'woocommerce_rest_product_partially_out_of_stock', `Not enough stock of ${product.name} for that quantity.`);
  }
  const unitPence = Number.parseInt(product.prices.price, 10);
  if (!Number.isInteger(unitPence) || unitPence <= 0 || product.prices.currency_code !== 'GBP') {
    throw new PricingError(502, 'upstream_unavailable', `Could not read the price of ${product.name}.`);
  }
  const linePence = unitPence * input.quantity;
  const { ex, tax } = splitVat(linePence);
  const parent = parentProductIdOf(input.id);
  const name = product.type === 'variation' && product.variation ? `${product.name} (${product.variation})` : product.name;
  return {
    id: input.id,
    productId: parent ?? input.id,
    variationId: parent ? input.id : null,
    quantity: input.quantity,
    name,
    unitPence,
    linePence,
    lineExPence: ex,
    lineTaxPence: tax,
  };
}

/**
 * Prices the basket from the live Store API. Throws PricingError (400/404 for the shopper's basket, 502 upstream).
 * When `expectedTotalPence` is given and the first pass disagrees, the prices are fetched again bypassing the memo
 * before the mismatch is reported, so a price change on the store is never masked by our own cache.
 */
export async function priceBasket(items: readonly BasketLineInput[], shippingOptionId: string, expectedTotalPence?: number, couponCode?: string): Promise<PricedBasket> {
  const shipping = shippingOptionById(shippingOptionId);
  const ids = items.map((i) => i.id);
  // The promo code is checked by WooCommerce in parallel with the price lookup (CouponError 400 when it no longer applies).
  const [first, coupon] = await Promise.all([getProductsForIds(ids), couponCode ? quoteCoupon(items, couponCode) : Promise.resolve(null)]);
  let priced = assemble(items, first, shipping, coupon);
  if (expectedTotalPence !== undefined && priced.totalPence !== expectedTotalPence) {
    const fresh = await getProductsForIds(ids, true);
    priced = assemble(items, fresh, shipping, coupon);
  }
  return priced;
}

function assemble(items: readonly BasketLineInput[], products: Map<number, WooProduct>, shipping: ShippingOption, coupon: CouponQuote | null): PricedBasket {
  const lines = items.map((i) => priceLine(i, products.get(i.id)));
  const itemsPence = lines.reduce((n, l) => n + l.linePence, 0);
  const itemsExPence = lines.reduce((n, l) => n + l.lineExPence, 0);
  const itemsTaxPence = lines.reduce((n, l) => n + l.lineTaxPence, 0);
  return {
    lines,
    shipping,
    itemsPence,
    itemsExPence,
    itemsTaxPence,
    totalTaxPence: itemsTaxPence + shipping.taxPence - (coupon?.discountTaxPence ?? 0),
    totalPence: itemsPence + shipping.pricePence - (coupon?.discountPence ?? 0),
    coupon,
  };
}
