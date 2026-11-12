/**
 * TypeScript interfaces for the WooCommerce Store API v1.
 * Shapes match https://wdlocks.co.uk/wp-json/wc/store/v1/ responses exactly.
 * All monetary values are strings in minor units (pence): "3499" === £34.99.
 */

export type WooProductType = 'simple' | 'variable' | 'grouped' | 'external' | 'variation';

export interface WooCurrency {
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WooPriceRange {
  min_amount: string;
  max_amount: string;
}

export interface WooProductPrices extends WooCurrency {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: WooPriceRange | null;
}

export interface WooCartItemPrices extends WooProductPrices {
  raw_prices: {
    precision: number;
    price: string;
    regular_price: string;
    sale_price: string;
  };
}

export interface WooImage {
  id: number;
  src: string;
  thumbnail: string;
  srcset: string;
  sizes: string;
  name: string;
  alt: string;
}

export interface WooCartItemImage extends WooImage {
  thumbnail_srcset: string;
  thumbnail_sizes: string;
}

export interface WooCategoryRef {
  id: number;
  name: string;
  slug: string;
  link: string;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
  image: WooImage | null;
  review_count: number;
  permalink: string;
}

export interface WooAttributeTerm {
  id: number;
  name: string;
  slug: string;
  default?: boolean;
}

export interface WooProductAttribute {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: WooAttributeTerm[];
}

export interface WooVariationAttribute {
  name: string;
  value: string;
}

export interface WooVariation {
  id: number;
  attributes: WooVariationAttribute[];
}

export interface WooAddToCart {
  text: string;
  description: string;
  url: string;
  single_text: string;
  minimum: number;
  maximum: number;
  multiple_of: number;
}

export interface WooStockAvailability {
  text: string;
  class: 'in-stock' | 'out-of-stock' | 'available-on-backorder' | string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: WooProductType;
  variation: string;
  permalink: string;
  sku: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: WooProductPrices;
  price_html: string;
  average_rating: string;
  review_count: number;
  images: WooImage[];
  categories: WooCategoryRef[];
  tags: WooCategoryRef[];
  brands: WooCategoryRef[];
  attributes: WooProductAttribute[];
  variations: WooVariation[];
  grouped_products: number[];
  has_options: boolean;
  is_purchasable: boolean;
  is_in_stock: boolean;
  is_on_backorder: boolean;
  low_stock_remaining: number | null;
  stock_availability: WooStockAvailability;
  sold_individually: boolean;
  weight: string;
  dimensions: { length: string; width: string; height: string };
  formatted_weight: string;
  formatted_dimensions: string;
  add_to_cart: WooAddToCart;
  is_password_protected: boolean;
  extensions: Record<string, unknown>;
}

export interface WooQuantityLimits {
  minimum: number;
  maximum: number;
  multiple_of: number;
  editable: boolean;
}

export interface WooCartItemVariation {
  /** Human label, e.g. "Lock Size". */
  attribute: string;
  /** Human value, e.g. "35 Inside / 35 Outside". */
  value: string;
  /** Form field name, e.g. "attribute_pa_locksize". */
  raw_attribute: string;
}

export interface WooCartItemTotals extends WooCurrency {
  line_subtotal: string;
  line_subtotal_tax: string;
  line_total: string;
  line_total_tax: string;
}

export interface WooCartItem {
  key: string;
  id: number;
  type: WooProductType;
  quantity: number;
  quantity_limits: WooQuantityLimits;
  name: string;
  short_description: string;
  description: string;
  sku: string;
  low_stock_remaining: number | null;
  backorders_allowed: boolean;
  show_backorder_badge: boolean;
  sold_individually: boolean;
  permalink: string;
  images: WooCartItemImage[];
  variation: WooCartItemVariation[];
  item_data: Array<{ key: string; value: string; display?: string }>;
  prices: WooCartItemPrices;
  totals: WooCartItemTotals;
  catalog_visibility: string;
  extensions: Record<string, unknown>;
}

export interface WooTaxLine {
  name: string;
  price: string;
  rate: string;
}

export interface WooCartTotals extends WooCurrency {
  total_items: string;
  total_items_tax: string;
  total_fees: string;
  total_fees_tax: string;
  total_discount: string;
  total_discount_tax: string;
  total_shipping: string | null;
  total_shipping_tax: string | null;
  total_price: string;
  total_tax: string;
  tax_lines: WooTaxLine[];
}

export interface WooCartAddress {
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
  email?: string;
}

export interface WooShippingRate {
  rate_id: string;
  name: string;
  description: string;
  delivery_time: string;
  price: string;
  taxes: string;
  method_id: string;
  instance_id: number;
  meta_data: Array<{ key: string; value: string }>;
  selected: boolean;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
}

export interface WooShippingPackage {
  package_id: number;
  name: string;
  destination: WooCartAddress;
  items: Array<{ key: string; name: string; quantity: number }>;
  shipping_rates: WooShippingRate[];
}

export interface WooCartError {
  code: string;
  message: string;
}

export interface WooCart {
  items: WooCartItem[];
  coupons: Array<{ code: string; discount_type: string; totals: Record<string, string> }>;
  fees: Array<{ id: string; name: string; totals: Record<string, string> }>;
  totals: WooCartTotals;
  shipping_address: WooCartAddress;
  billing_address: WooCartAddress;
  needs_payment: boolean;
  needs_shipping: boolean;
  payment_requirements: string[];
  has_calculated_shipping: boolean;
  shipping_rates: WooShippingPackage[];
  items_count: number;
  items_weight: number;
  cross_sells: unknown[];
  errors: WooCartError[];
  payment_methods: string[];
  extensions: Record<string, unknown>;
}

/** Error envelope returned by the Store API (and re-emitted by our proxy routes). */
export interface WooStoreError {
  code: string;
  message: string;
  data?: { status: number; [key: string]: unknown };
}

/* ---------------------------------------------------------------------------
 * Checkout on our domain (Stripe + WooCommerce REST order). See docs/stripe-checkout-plan.md.
 * ------------------------------------------------------------------------- */

/** Checkout address (billing or delivery), validated server-side by parseAddress. */
export interface CheckoutAddressInput {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
}

/** One basket line as the browser sends it: the server prices it from the Store API (src/lib/pricing.ts). */
export interface BasketLineRequest {
  /** Simple product id, or the variation id for variable products. */
  id: number;
  quantity: number;
}

/**
 * POST /api/checkout/intent — prices the client-held basket, creates the WooCommerce order (pending) and a Stripe
 * PaymentIntent. This is the only call in the whole shopping flow that reaches WooCommerce.
 */
export interface CreatePaymentIntentRequest {
  items: BasketLineRequest[];
  /** SHIPPING_OPTIONS id of the chosen delivery rate. */
  shipping_option: string;
  billing_address: CheckoutAddressInput;
  shipping_address?: CheckoutAddressInput;
  customer_note?: string;
  /** Minor-unit total the shopper saw; the server refuses with 409 `total_mismatch` when its own pricing differs. */
  expected_total: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  orderId: number;
  orderKey: string;
  /** Minor units. */
  amount: number;
  currency: 'gbp';
}

export type CheckoutOrderStatus = 'pending' | 'processing' | 'on-hold' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'unknown';

/** GET /api/checkout/status?order=<id>&key=<order_key> */
export interface CheckoutStatusResponse {
  orderId: number;
  orderNumber: string;
  status: CheckoutOrderStatus;
  paid: boolean;
  total: string;
  currency: string;
  email?: string;
}
