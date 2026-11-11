/**
 * Optimistic basket helpers. Adding to the basket takes one or two round trips to the WooCommerce Store API on
 * shared hosting (roughly 1–3 s). Instead of making the shopper wait with a spinner, the drawer opens at once
 * with a provisional line built from the product data we already have; the server's cart replaces it when the
 * request returns, or the line disappears again with an error toast if the request fails.
 */
import type { WooCart, WooCartItem, WooCurrency, WooProduct } from '@/types';

export interface CartLinePreview {
  /** Product (simple) or variation ID — the same id sent to /api/cart/add. */
  id: number;
  quantity: number;
  name: string;
  /** Unit price in minor units (pence), as displayed on the card/page. */
  pricePence: number;
  image?: { src: string; thumbnail?: string; alt?: string } | null;
  /** Human-readable variation, e.g. [{ attribute: 'Lock Size', value: '35 / 35' }]. */
  variation?: Array<{ attribute: string; value: string }>;
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

export const OPTIMISTIC_KEY_PREFIX = 'pending-';

export function isOptimisticKey(key: string): boolean {
  return key.startsWith(OPTIMISTIC_KEY_PREFIX);
}

/** An empty basket shaped like a Store API response, for shoppers with no session yet. */
export function emptyCart(): WooCart {
  return {
    items: [],
    coupons: [],
    fees: [],
    totals: {
      ...GBP,
      total_items: '0',
      total_items_tax: '0',
      total_fees: '0',
      total_fees_tax: '0',
      total_discount: '0',
      total_discount_tax: '0',
      total_shipping: null,
      total_shipping_tax: null,
      total_price: '0',
      total_tax: '0',
      tax_lines: [],
    },
    shipping_address: emptyAddress(),
    billing_address: emptyAddress(),
    needs_payment: false,
    needs_shipping: false,
    payment_requirements: [],
    has_calculated_shipping: false,
    shipping_rates: [],
    items_count: 0,
    items_weight: 0,
    cross_sells: [],
    errors: [],
    payment_methods: [],
    extensions: {},
  };
}

function emptyAddress() {
  return { first_name: '', last_name: '', company: '', address_1: '', address_2: '', city: '', state: '', postcode: '', country: 'GB' };
}

/** Builds a provisional cart line. Prices shown on the site include VAT, so the whole amount sits in the subtotal. */
export function optimisticLine(preview: CartLinePreview): WooCartItem {
  const unit = Math.max(0, Math.round(preview.pricePence));
  const line = String(unit * preview.quantity);
  const price = String(unit);
  const img = preview.image;
  return {
    key: `${OPTIMISTIC_KEY_PREFIX}${preview.id}-${Date.now()}`,
    id: preview.id,
    type: preview.variation?.length ? 'variation' : 'simple',
    quantity: preview.quantity,
    quantity_limits: { minimum: 1, maximum: 99, multiple_of: 1, editable: false },
    name: preview.name,
    short_description: '',
    description: '',
    sku: '',
    low_stock_remaining: null,
    backorders_allowed: false,
    show_backorder_badge: false,
    sold_individually: false,
    permalink: '',
    images: img
      ? [{ id: 0, src: img.src, thumbnail: img.thumbnail ?? img.src, srcset: '', sizes: '', name: '', alt: img.alt ?? '', thumbnail_srcset: '', thumbnail_sizes: '' }]
      : [],
    variation: (preview.variation ?? []).map((v) => ({ attribute: v.attribute, value: v.value, raw_attribute: '' })),
    item_data: [],
    prices: {
      ...GBP,
      price,
      regular_price: price,
      sale_price: price,
      price_range: null,
      raw_prices: { precision: 6, price: `${price}0000`, regular_price: `${price}0000`, sale_price: `${price}0000` },
    },
    totals: { ...GBP, line_subtotal: line, line_subtotal_tax: '0', line_total: line, line_total_tax: '0' },
    catalog_visibility: 'visible',
    extensions: {},
  };
}

/** Preview for a simple product card ("Buy now" on the grid). */
export function previewFromProduct(product: WooProduct, quantity = 1, name?: string): CartLinePreview {
  const image = product.images[0];
  return {
    id: product.id,
    quantity,
    name: name ?? product.name,
    pricePence: Number.parseInt(product.prices.price, 10) || 0,
    image: image ? { src: image.src, thumbnail: image.thumbnail, alt: image.alt } : null,
  };
}
