/**
 * The client-held basket.
 *
 * WHY
 *   wdlocks.co.uk answers every Store API cart call in 1.1–1.6 s from the UK and 2–3 s through the Vercel function
 *   (measured 12 Nov 2026), so a basket kept in a WooCommerce session made every add, +/− and remove a two-second
 *   wait. Nothing can be changed on the WordPress host. The basket therefore lives in the browser (localStorage) and
 *   the WooCommerce side is touched exactly once, at "Place order", when /api/checkout/intent re-prices every line
 *   from the Store API products endpoint and creates the order.
 *
 * WHAT IS STORED
 *   Product/variation id, quantity, the WooCommerce attribute pair for variations (what the order needs) and a display
 *   snapshot (name, inc-VAT unit price, image, human variation label) captured from the Store API product data the
 *   shopper was looking at. The snapshot is only for display and for the `expected_total` the server verifies; the
 *   server never trusts it. No cookie and no signature: the only client facts the server acts on are ids and
 *   quantities, which are the shopper's choice anyway.
 *
 * SHAPE
 *   `buildCart` turns the stored lines into a `WooCart`, the Store API shape the drawer, basket page, checkout and
 *   order summary already render, so those components needed no rewrite. Prices on the site include 20 % VAT; the
 *   split mirrors WooCommerce's (ex = round(inc / 1.2), tax = inc − ex), verified line by line against the live cart.
 */
import type { WooCart, WooCartItem, WooCurrency, WooProduct, WooShippingPackage, WooShippingRate } from '@/types';
import { CATALOGUE_BY_ID, CYLINDER_SIZES, MAX_CART_QUANTITY, PURCHASABLE_IDS, RIM_COLOURS, SHIPPING_OPTIONS, THUMB_SIZES, VARIATIONS_BY_PRODUCT, type ShippingOption } from '@/lib/constants';

export const BASKET_STORAGE_KEY = 'wd:basket';
const BASKET_VERSION = 1;
/** Baskets older than this are dropped on load (prices and stock will have moved on). */
const BASKET_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_BASKET_LINES = 20;

export interface BasketLineSnapshot {
  name: string;
  /** Unit price in pence, including VAT, as shown on the card/page when the line was added. */
  pricePence: number;
  image?: { src: string; thumbnail?: string; alt?: string } | null;
  /** Human-readable variation, e.g. [{ attribute: 'Size', value: '35 Inside / 35 Outside' }]. */
  variation?: Array<{ attribute: string; value: string }>;
}

export interface BasketLine extends BasketLineSnapshot {
  /** Simple product id, or the variation id for variable products (what WooCommerce adds). */
  id: number;
  quantity: number;
  /** WooCommerce attribute pair for variations, e.g. [{ attribute: 'pa_locksize', value: '35-inside-35-outside' }]. */
  attributes?: Array<{ attribute: string; value: string }>;
  addedAt: number;
  /** Set when the server re-priced this line (409 total_mismatch): the snapshot price then beats the ISR catalogue. */
  verifiedAt?: number;
}

export interface BasketState {
  v: number;
  lines: BasketLine[];
  /** Chosen delivery option (SHIPPING_OPTIONS id); the first option is the default. */
  shippingOptionId: string;
  updatedAt: number;
}

/** What the browser sends to /api/checkout/intent: ids and quantities only, the server prices everything. */
export interface BasketLineInput {
  id: number;
  quantity: number;
}

export const GBP: WooCurrency = {
  currency_code: 'GBP',
  currency_symbol: '£',
  currency_minor_unit: 2,
  currency_decimal_separator: '.',
  currency_thousand_separator: ',',
  currency_prefix: '£',
  currency_suffix: '',
};

/* ---------------------------------------------------------------------------
 * Money
 * ------------------------------------------------------------------------- */

export const VAT_RATE = 0.2;

/** Splits an inc-VAT amount in pence the way WooCommerce does for prices entered inclusive of 20 % VAT. */
export function splitVat(incPence: number): { ex: number; tax: number } {
  const ex = Math.round(incPence / (1 + VAT_RATE));
  return { ex, tax: incPence - ex };
}

export function emptyBasket(): BasketState {
  return { v: BASKET_VERSION, lines: [], shippingOptionId: SHIPPING_OPTIONS[0].id, updatedAt: Date.now() };
}

export function shippingOptionById(id: string | null | undefined): ShippingOption {
  return SHIPPING_OPTIONS.find((o) => o.id === id) ?? SHIPPING_OPTIONS[0];
}

/* ---------------------------------------------------------------------------
 * Storage (browser only; every caller guards for SSR)
 * ------------------------------------------------------------------------- */

function isLine(value: unknown): value is BasketLine {
  if (!value || typeof value !== 'object') return false;
  const l = value as Record<string, unknown>;
  return (
    typeof l.id === 'number' && PURCHASABLE_IDS.has(l.id) &&
    typeof l.quantity === 'number' && Number.isInteger(l.quantity) && l.quantity >= 1 && l.quantity <= MAX_CART_QUANTITY &&
    typeof l.name === 'string' && typeof l.pricePence === 'number' && Number.isFinite(l.pricePence)
  );
}

export function readBasket(): BasketState {
  if (typeof window === 'undefined') return emptyBasket();
  try {
    const raw = window.localStorage.getItem(BASKET_STORAGE_KEY);
    if (!raw) return emptyBasket();
    const parsed = JSON.parse(raw) as Partial<BasketState>;
    if (parsed.v !== BASKET_VERSION || !Array.isArray(parsed.lines)) return emptyBasket();
    if (typeof parsed.updatedAt !== 'number' || Date.now() - parsed.updatedAt > BASKET_TTL_MS) return emptyBasket();
    return {
      v: BASKET_VERSION,
      lines: parsed.lines.filter(isLine).slice(0, MAX_BASKET_LINES),
      shippingOptionId: shippingOptionById(parsed.shippingOptionId).id,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return emptyBasket();
  }
}

export function writeBasket(state: BasketState): void {
  if (typeof window === 'undefined') return;
  try {
    if (state.lines.length === 0 && state.shippingOptionId === SHIPPING_OPTIONS[0].id) {
      window.localStorage.removeItem(BASKET_STORAGE_KEY);
    } else {
      window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify({ ...state, v: BASKET_VERSION }));
    }
  } catch {
    /* private mode / quota: the in-memory basket still works for this page */
  }
}

/* ---------------------------------------------------------------------------
 * Line helpers
 * ------------------------------------------------------------------------- */

export function lineKey(id: number): string {
  return `line-${id}`;
}

/** Parent product id for a variation id, from the static catalogue; null for simple products / unknown ids. */
export function parentProductIdOf(id: number): number | null {
  for (const [parent, variations] of Object.entries(VARIATIONS_BY_PRODUCT)) {
    if (variations.includes(id)) return Number(parent);
  }
  return null;
}

/** Human label for a known variation id ("35 Inside / 35 Outside", "Brass"). */
export function variationLabel(id: number): { attribute: string; value: string } | null {
  const size = CYLINDER_SIZES.find((s) => s.variationId === id) ?? THUMB_SIZES.find((s) => s.variationId === id);
  if (size) return { attribute: 'Size', value: size.label };
  const colour = RIM_COLOURS.find((c) => c.variationId === id);
  if (colour) return { attribute: 'Finish', value: colour.label };
  return null;
}

/**
 * Display snapshot for an id when the caller has none (e.g. the keyed-alike add-on): catalogue name, the live
 * product's price and photo when the product list is at hand.
 */
export function describeLine(id: number, products: readonly WooProduct[] = []): BasketLineSnapshot {
  const parentId = parentProductIdOf(id) ?? id;
  const product = products.find((p) => p.id === parentId);
  const entry = CATALOGUE_BY_ID[parentId];
  const image = product?.images[0];
  const variation = variationLabel(id);
  return {
    name: product?.name ?? entry?.name ?? `Product ${id}`,
    pricePence: product ? Number.parseInt(product.prices.price, 10) || 0 : 0,
    image: image ? { src: image.src, thumbnail: image.thumbnail, alt: image.alt } : null,
    ...(variation ? { variation: [variation] } : {}),
  };
}

/** Snapshot for a simple product card ("Buy now" on the grid, upsells, the keys configurator). */
export function previewFromProduct(product: WooProduct, quantity = 1, name?: string): BasketLineSnapshot & { id: number; quantity: number } {
  const image = product.images[0];
  return {
    id: product.id,
    quantity,
    name: name ?? product.name,
    pricePence: Number.parseInt(product.prices.price, 10) || 0,
    image: image ? { src: image.src, thumbnail: image.thumbnail, alt: image.alt } : null,
  };
}

/**
 * Current inc-VAT unit price for a line: the live catalogue product (ISR, 60 s) when it is at hand and prices one
 * amount (every Watchdog variation shares its parent's price), otherwise the snapshot taken when the line was added.
 * The server re-prices from the Store API at order time regardless.
 */
const VERIFIED_PRICE_TTL_MS = 10 * 60 * 1000;

export function unitPriceFor(line: BasketLine, products: readonly WooProduct[]): number {
  if (line.verifiedAt && Date.now() - line.verifiedAt < VERIFIED_PRICE_TTL_MS) return Math.max(0, Math.round(line.pricePence));
  const parentId = parentProductIdOf(line.id) ?? line.id;
  const product = products.find((p) => p.id === parentId);
  if (product && !product.prices.price_range) {
    const live = Number.parseInt(product.prices.price, 10);
    if (Number.isFinite(live) && live > 0) return live;
  }
  return Math.max(0, Math.round(line.pricePence));
}

function toCartItem(line: BasketLine, unitPence: number): WooCartItem {
  const inc = unitPence * line.quantity;
  const { ex, tax } = splitVat(inc);
  const price = String(unitPence);
  const img = line.image;
  return {
    key: lineKey(line.id),
    id: line.id,
    type: parentProductIdOf(line.id) ? 'variation' : 'simple',
    quantity: line.quantity,
    quantity_limits: { minimum: 1, maximum: MAX_CART_QUANTITY, multiple_of: 1, editable: true },
    name: line.name,
    short_description: '',
    description: '',
    sku: '',
    low_stock_remaining: null,
    backorders_allowed: false,
    show_backorder_badge: false,
    sold_individually: false,
    permalink: '',
    images: img ? [{ id: 0, src: img.src, thumbnail: img.thumbnail ?? img.src, srcset: '', sizes: '', name: '', alt: img.alt ?? '', thumbnail_srcset: '', thumbnail_sizes: '' }] : [],
    variation: (line.variation ?? []).map((v) => ({ attribute: v.attribute, value: v.value, raw_attribute: '' })),
    item_data: [],
    prices: {
      ...GBP,
      price,
      regular_price: price,
      sale_price: price,
      price_range: null,
      raw_prices: { precision: 6, price: `${price}0000`, regular_price: `${price}0000`, sale_price: `${price}0000` },
    },
    totals: { ...GBP, line_subtotal: String(ex), line_subtotal_tax: String(tax), line_total: String(ex), line_total_tax: String(tax) },
    catalog_visibility: 'visible',
    extensions: {},
  };
}

function toRate(option: ShippingOption, selected: boolean): WooShippingRate {
  return {
    rate_id: option.rateId,
    name: option.label,
    description: '',
    delivery_time: option.eta,
    price: String(option.exVatPence),
    taxes: String(option.taxPence),
    method_id: option.methodId,
    instance_id: option.instanceId,
    meta_data: [],
    selected,
    currency_code: GBP.currency_code,
    currency_symbol: GBP.currency_symbol,
    currency_minor_unit: GBP.currency_minor_unit,
  };
}

function emptyAddress() {
  return { first_name: '', last_name: '', company: '', address_1: '', address_2: '', city: '', state: '', postcode: '', country: 'GB' };
}

/** An empty basket shaped like a Store API response. */
export function emptyCart(): WooCart {
  return buildCart(emptyBasket(), []);
}

/**
 * The basket as a Store API cart: lines, VAT split, the three Royal Mail options (the chosen one selected) and the
 * grand total in pence. Shipping is only added once there is something to ship.
 */
export function buildCart(state: BasketState, products: readonly WooProduct[] = []): WooCart {
  const items = state.lines.map((line) => toCartItem(line, unitPriceFor(line, products)));
  const total_items = items.reduce((n, i) => n + Number(i.totals.line_subtotal), 0);
  const total_items_tax = items.reduce((n, i) => n + Number(i.totals.line_subtotal_tax), 0);
  const needsShipping = items.length > 0;
  const chosen = shippingOptionById(state.shippingOptionId);
  const shipping = needsShipping ? chosen.exVatPence : 0;
  const shippingTax = needsShipping ? chosen.taxPence : 0;
  const total_tax = total_items_tax + shippingTax;
  const total_price = total_items + total_items_tax + shipping + shippingTax;
  const packages: WooShippingPackage[] = needsShipping
    ? [{
        package_id: 0,
        name: 'Delivery',
        destination: emptyAddress(),
        items: items.map((i) => ({ key: i.key, name: i.name, quantity: i.quantity })),
        shipping_rates: SHIPPING_OPTIONS.map((o) => toRate(o, o.id === chosen.id)),
      }]
    : [];
  return {
    items,
    coupons: [],
    fees: [],
    totals: {
      ...GBP,
      total_items: String(total_items),
      total_items_tax: String(total_items_tax),
      total_fees: '0',
      total_fees_tax: '0',
      total_discount: '0',
      total_discount_tax: '0',
      total_shipping: needsShipping ? String(shipping) : null,
      total_shipping_tax: needsShipping ? String(shippingTax) : null,
      total_price: String(total_price),
      total_tax: String(total_tax),
      tax_lines: total_tax > 0 ? [{ name: 'VAT', price: String(total_tax), rate: '20%' }] : [],
    },
    shipping_address: emptyAddress(),
    billing_address: emptyAddress(),
    needs_payment: total_price > 0,
    needs_shipping: needsShipping,
    payment_requirements: ['products'],
    has_calculated_shipping: needsShipping,
    shipping_rates: packages,
    items_count: items.reduce((n, i) => n + i.quantity, 0),
    items_weight: 0,
    cross_sells: [],
    errors: [],
    payment_methods: [],
    extensions: {},
  };
}

/** Ids and quantities for the server, in the order the shopper added them. */
export function toLineInputs(state: BasketState): BasketLineInput[] {
  return state.lines.map((l) => ({ id: l.id, quantity: l.quantity }));
}
