/**
 * Site-wide constants: design tokens, product catalogue and variation maps.
 * Product and variation IDs were read from the live Store API on 2026-11-09.
 */

export const WC_BASE =
  (process.env.NEXT_PUBLIC_WC_BASE ?? 'https://wdlocks.co.uk').replace(/\/$/, '');
export const STORE_API = `${WC_BASE}/wp-json/wc/store/v1`;
export const CHECKOUT_URL = `${WC_BASE}/checkout/`;
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
/** true once backend/wd-cart-handoff.php is installed on WordPress — enables multi-line checkout handoff. */
export const HANDOFF_PLUGIN_INSTALLED = process.env.NEXT_PUBLIC_CART_HANDOFF_PLUGIN === 'true';

export const PRODUCT_IDS = {
  CYLINDER_LOCK: 5141,
  RIM_CYLINDER: 5112,
  THUMB_TURN: 5077,
  HALF_CYLINDER: 3861,
  LUBRICANT: 4384,
  EXTRA_KEYS_3: 4266,
  EXTRA_KEYS_1: 6062,
  KEYED_ALIKE: 5642,
  BRUNO_TEDDY: 5565,
} as const;

export type ProductKey = keyof typeof PRODUCT_IDS;


export const SITE = {
  name: 'Watchdog Locks',
  shortName: 'WD Locks',
  tagline: 'Security you can trust.',
  description:
    'BSI Kitemarked 3-star euro cylinder locks. Sold Secure Diamond rated. Same-day dispatch before 3pm.',
  locale: 'en_GB',
  email: 'sales@wdlocks.co.uk',
  phone: '0203 857 4718',
  phoneHref: 'tel:02038574718',
  freephone: '0800 389 9965',
  freephoneHref: 'tel:08003899965',
  dispatchCutoff: '3pm',
} as const;

/** TODO: confirm the client's Trustpilot profile URL before go-live. */
export const TRUSTPILOT_URL = 'https://uk.trustpilot.com/review/wdlocks.co.uk';

/** NOTE: the live store charges for delivery (Royal Mail from £6.40) — do not advertise free delivery. */
export const ANNOUNCEMENT =
  'Same-day dispatch before 3pm · BSI Kitemarked 3 Star · 3 keys with every lock';

export const TRUST_SIGNALS = [
  { id: 'bsi', label: 'BSI Kitemarked', detail: 'TS 007 3-star rated', image: '/brand/bsi-kitemark.webp' },
  { id: 'sold-secure', label: 'Sold Secure Diamond', detail: 'Highest standard, 2024', image: '/brand/sold-secure-diamond.png' },
  { id: 'trustpilot', label: '5★ Trustpilot', detail: 'Rated excellent by UK customers', image: null },
  { id: 'sbd', label: 'Secured by Design', detail: 'Police preferred specification', image: '/brand/secured-by-design.png' },
] as const;

/** £5,000 security guarantee — registration lives on the WooCommerce site. */
export const GUARANTEE = {
  amountLabel: '£5,000',
  registerUrl: `${WC_BASE}/guarantee-registration/`,
  blurb: 'Register your Watchdog lock and we activate KeyControl plus your £5,000 security guarantee.',
} as const;

/** Shipping options as configured on the live WooCommerce store (read from its checkout on 2026-11-10). Pence. */
export const SHIPPING_OPTIONS = [
  { id: 'rm-signed', label: 'Royal Mail 1st Class Signed For', eta: '3–5 working days', pricePence: 640, transitDays: [3, 5] as const },
  { id: 'rm-24', label: 'Royal Mail Special Delivery 24hr', eta: 'next working day', pricePence: 1000, transitDays: [1, 1] as const },
  { id: 'saturday', label: 'Saturday Delivery', eta: 'Saturday', pricePence: 2880, transitDays: [1, 1] as const },
] as const;

/** Dispatch cut-off: orders before 15:00 Europe/London Mon–Fri ship the same day. */
export const DISPATCH = { cutoffHour: 15, timeZone: 'Europe/London' } as const;

/** Products pushed as "Quick add" upsells in the basket drawer (simple products only). */
export const UPSELL_PRODUCT_IDS: readonly number[] = [PRODUCT_IDS.LUBRICANT, PRODUCT_IDS.KEYED_ALIKE];

/** Default variation preselected on variable products (the most common composite-door size). */
export const DEFAULT_VARIATION_ID: Readonly<Record<number, number>> = {
  [PRODUCT_IDS.CYLINDER_LOCK]: 5168, // 35 Inside / 35 Outside
  [PRODUCT_IDS.THUMB_TURN]: 5107, // 35 Thumb / 35 Outside
  [PRODUCT_IDS.RIM_CYLINDER]: 5137, // Brass
};

/** Mobile menu "Most viewed" quick links. */
export const MOST_VIEWED = [
  { label: 'Buy a 3 Star cylinder', href: '/products/3-star-alps-cylinder-door-lock' },
  { label: 'Thumb turn locks', href: '/products/3-star-alps-euro-cylinder-thumb-turn-lock' },
  { label: 'Order extra keys', href: '/products/watchdog-3-star-alps-extra-keys' },
  { label: 'Activate my guarantee', href: `${WC_BASE}/guarantee-registration/`, external: true },
  { label: 'Lock lubricant', href: '/products/watchdog-3-star-alps-lock-lubricant' },
] as const;

export type MenuGroupId = 'locks' | 'keys';

/** Header navigation. Items with `menu` open a card-style mega-menu (see MegaMenu.tsx). */
export const NAV_LINKS = [
  { label: 'Locks', href: '/products', menu: 'locks' as MenuGroupId },
  { label: 'Keys & Aftercare', href: '/products#keys-and-aftercare', menu: 'keys' as MenuGroupId },
  { label: 'Why Watchdog', href: '/#why-watchdog', menu: null },
  { label: 'Reviews', href: '/#reviews', menu: null },
  { label: 'Contact', href: '/#contact', menu: null },
] as const;

/** Mega-menu contents: featured product cards + secondary text links, per group. Keys reference CATALOGUE. */
export const MENU_GROUPS: Readonly<Record<MenuGroupId, { title: string; featured: ProductKey[]; more: Array<{ label: string; href: string; external?: boolean }> }>> = {
  locks: {
    title: 'Locks',
    featured: ['CYLINDER_LOCK', 'THUMB_TURN', 'RIM_CYLINDER', 'HALF_CYLINDER'],
    more: [
      { label: 'All products', href: '/products' },
      { label: 'Sizing guide', href: '/products/3-star-alps-cylinder-door-lock#sizing' },
      { label: 'Keyed-alike service', href: '/products/watchdog-keyed-a-like' },
      { label: 'Trade application', href: `${WC_BASE}/trade-application/`, external: true },
    ],
  },
  keys: {
    title: 'Keys & Aftercare',
    featured: ['EXTRA_KEYS_3', 'EXTRA_KEYS_1', 'LUBRICANT', 'BRUNO_TEDDY'],
    more: [
      { label: 'Keyed-alike service', href: '/products/watchdog-keyed-a-like' },
      { label: 'Activate £5,000 guarantee', href: `${WC_BASE}/guarantee-registration/`, external: true },
      { label: 'Why Watchdog', href: '/#why-watchdog' },
      { label: 'Contact us', href: '/#contact' },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * Design tokens (mirrored as CSS custom properties in globals.css)
 * ------------------------------------------------------------------------- */
export const COLOURS = {
  cream: '#F8F3EC',
  creamMid: '#F0E9DF',
  creamDark: '#E6DDD0',
  warmWhite: '#FDFAF6',
  red: '#DA1519',
  redDark: '#B8100F',
  /** Deep red used on wdlocks.co.uk/shop hover states. */
  redDeep: '#C00802',
  charcoal: '#292734',
  /** Navy from wdlocks.co.uk/shop — dark panels. */
  navy: '#27374D',
  /** Blue-grey from wdlocks.co.uk/shop — borders on dark panels. */
  blueGrey: '#DDE6ED',
  nearBlack: '#0A0806',
} as const;

export const FONTS = {
  body: "'Inter', sans-serif",
  serif: "'Playfair Display', Georgia, serif",
} as const;

/* ---------------------------------------------------------------------------
 * Product catalogue
 * ------------------------------------------------------------------------- */
export interface CatalogueEntry {
  key: ProductKey;
  id: number;
  slug: string;
  name: string;
  shortName: string;
  type: 'simple' | 'variable';
  category: string;
  /** Short marketing blurb used in the mega-menu and cards. */
  blurb: string;
  /** Shows a "Popular" badge on cards and in the mega-menu. */
  popular?: boolean;
}

/**
 * Static catalogue used for navigation, static params and fallbacks.
 * Slugs match the live WooCommerce slugs so canonical URLs stay stable.
 * NOTE: the brief listed EXTRA_KEYS_3 (4266) as variable; the live store has it as simple.
 */
export const CATALOGUE: readonly CatalogueEntry[] = [
  {
    key: 'CYLINDER_LOCK',
    id: 5141,
    slug: '3-star-alps-cylinder-door-lock',
    name: 'Watchdog 3 Star ALPS Cylinder Lock',
    shortName: '3 Star Cylinder Lock',
    type: 'variable',
    category: 'Euro Cylinder Lock',
    blurb: 'Anti-snap, anti-bump euro cylinder. 17 sizes.',
    popular: true,
  },
  {
    key: 'THUMB_TURN',
    id: 5077,
    slug: '3-star-alps-euro-cylinder-thumb-turn-lock',
    name: 'Watchdog 3 Star ALPS Thumb Turn Lock',
    shortName: '3 Star Thumb Turn',
    type: 'variable',
    category: 'Euro Thumb Turn Cylinder Lock',
    blurb: 'Key outside, thumb turn inside. 12 sizes.',
    popular: true,
  },
  {
    key: 'RIM_CYLINDER',
    id: 5112,
    slug: 'watchdog-rim-cylinder',
    name: 'Watchdog Rim Cylinder Lock',
    shortName: 'Rim Cylinder',
    type: 'variable',
    category: 'Rim Cylinder Lock',
    blurb: 'For nightlatches. Brass or nickel finish.',
  },
  {
    key: 'HALF_CYLINDER',
    id: 3861,
    slug: 'watchdog-3-star-alps-half-cylinder-lock-10-35',
    name: 'Watchdog 3 Star ALPS Half Cylinder Lock 10-35',
    shortName: 'Half Cylinder 10/35',
    type: 'simple',
    category: 'Half Cylinder',
    blurb: 'For garage doors, shutters and gates.',
  },
  {
    key: 'EXTRA_KEYS_3',
    id: 4266,
    slug: 'watchdog-3-star-alps-extra-keys',
    name: 'Watchdog 3 Star ALPS | Extra Keys',
    shortName: '3 Star Extra Keys',
    type: 'simple',
    category: 'Keys and Aftercare',
    blurb: 'Cut to your 3 Star ALPS lock.',
  },
  {
    key: 'EXTRA_KEYS_1',
    id: 6062,
    slug: 'watchdog-1-star-alps-extra-keys',
    name: 'Watchdog 1 Star Extra keys',
    shortName: '1 Star Extra Keys',
    type: 'simple',
    category: 'Keys and Aftercare',
    blurb: 'Spare keys for 1 Star cylinders.',
  },
  {
    key: 'KEYED_ALIKE',
    id: 5642,
    slug: 'watchdog-keyed-a-like',
    name: 'Watchdog Keyed-a-like Service, Same Key, Different Locks',
    shortName: 'Keyed-Alike Service',
    type: 'simple',
    category: 'Keys and Aftercare',
    blurb: 'One key for every lock you order.',
  },
  {
    key: 'LUBRICANT',
    id: 4384,
    slug: 'watchdog-3-star-alps-lock-lubricant',
    name: 'Watchdog 3 Star ALPS | Lock Lubricant',
    shortName: 'Lock Lubricant',
    type: 'simple',
    category: 'Keys and Aftercare',
    blurb: 'Keeps your cylinder turning smoothly.',
    popular: true,
  },
  {
    key: 'BRUNO_TEDDY',
    id: 5565,
    slug: 'bruno-teddy-protection-car-key-signal-blocker',
    name: 'Bruno Teddy Protection – Car Key Signal Blocker',
    shortName: 'Bruno Teddy Signal Blocker',
    type: 'simple',
    category: 'Car Security',
    blurb: 'Faraday teddy that stops relay theft.',
  },
] as const;

export const CATALOGUE_BY_ID: Readonly<Record<number, CatalogueEntry>> = Object.fromEntries(
  CATALOGUE.map((p) => [p.id, p]),
);
export const CATALOGUE_BY_SLUG: Readonly<Record<string, CatalogueEntry>> = Object.fromEntries(
  CATALOGUE.map((p) => [p.slug, p]),
);

/* ---------------------------------------------------------------------------
 * Variation maps
 * ------------------------------------------------------------------------- */
export interface SizeOption {
  /** Human label as shown on the live site, e.g. "35 Inside / 35 Outside". */
  label: string;
  /** Compact label for swatches, e.g. "35/35". */
  short: string;
  /** Inside (room side) measurement in mm; null for half-cylinder style sizes. */
  inside: number | null;
  /** Outside measurement in mm. */
  outside: number;
  /** WooCommerce variation ID — this is what gets added to the cart. */
  variationId: number;
  /** Taxonomy term slug for the pa_locksize attribute. */
  termSlug: string;
}

export const LOCK_SIZE_ATTRIBUTE = 'pa_locksize';
export const COLOUR_ATTRIBUTE = 'pa_colour';

/** Watchdog 3 Star ALPS Cylinder Lock (product 5141) — 17 sizes. */
export const CYLINDER_SIZES: readonly SizeOption[] = [
  { label: '10 / 35 Outside', short: '10/35', inside: 10, outside: 35, variationId: 5166, termSlug: '10-35-outside' },
  { label: '10 / 45 Outside', short: '10/45', inside: 10, outside: 45, variationId: 5190, termSlug: '10-45-outside' },
  { label: '10 / 55 Outside', short: '10/55', inside: 10, outside: 55, variationId: 5191, termSlug: '10-55-outside' },
  { label: '30 Inside / 30 Outside', short: '30/30', inside: 30, outside: 30, variationId: 5167, termSlug: '30-inside-30-outside' },
  { label: '30 Inside / 35 Outside', short: '30/35', inside: 30, outside: 35, variationId: 6082, termSlug: '30-inside-35-outside' },
  { label: '30 Inside / 55 Outside', short: '30/55', inside: 30, outside: 55, variationId: 6083, termSlug: '30-inside-55-outside' },
  { label: '30 Inside / 60 Outside', short: '30/60', inside: 30, outside: 60, variationId: 6084, termSlug: '30-inside-60-outside' },
  { label: '30 Inside / 70 Outside', short: '30/70', inside: 30, outside: 70, variationId: 5192, termSlug: '30-inside-70-outside' },
  { label: '35 Inside / 35 Outside', short: '35/35', inside: 35, outside: 35, variationId: 5168, termSlug: '35-inside-35-outside' },
  { label: '35 Inside / 50 Outside', short: '35/50', inside: 35, outside: 50, variationId: 5193, termSlug: '35-inside-50-outside' },
  { label: '35 Inside / 55 Outside', short: '35/55', inside: 35, outside: 55, variationId: 6085, termSlug: '35-inside-55-outside' },
  { label: '40 Inside / 40 Outside', short: '40/40', inside: 40, outside: 40, variationId: 5194, termSlug: '40-inside-40-outside' },
  { label: '45 Inside / 45 Outside', short: '45/45', inside: 45, outside: 45, variationId: 5169, termSlug: '45-inside-45-outside' },
  { label: '45 Inside / 50 Outside', short: '45/50', inside: 45, outside: 50, variationId: 5170, termSlug: '45-inside-50-outside' },
  { label: '45 Inside / 55 Outside', short: '45/55', inside: 45, outside: 55, variationId: 5171, termSlug: '45-inside-55-outside' },
  { label: '50 Inside / 50 Outside', short: '50/50', inside: 50, outside: 50, variationId: 5172, termSlug: '50-inside-50-outside' },
  { label: '55 Inside / 55 Outside', short: '55/55', inside: 55, outside: 55, variationId: 5195, termSlug: '55-inside-55-outside' },
] as const;

/** Watchdog 3 Star ALPS Thumb Turn Lock (product 5077) — 12 sizes. "Thumb" = inside. */
export const THUMB_SIZES: readonly SizeOption[] = [
  { label: '30 Thumb / 30 Outside', short: '30/30', inside: 30, outside: 30, variationId: 5196, termSlug: '30-thumb-30-outside' },
  { label: '30 Thumb / 60 Outside', short: '30/60', inside: 30, outside: 60, variationId: 6079, termSlug: '30-thumb-60-outside' },
  { label: '35 Thumb / 30 Outside', short: '35/30', inside: 35, outside: 30, variationId: 5106, termSlug: '35-thumb-30-outside' },
  { label: '35 Thumb / 35 Outside', short: '35/35', inside: 35, outside: 35, variationId: 5107, termSlug: '35-thumb-35-outside' },
  { label: '35 Thumb / 55 Outside', short: '35/55', inside: 35, outside: 55, variationId: 6080, termSlug: '35-thumb-55-outside' },
  { label: '40 Thumb / 40 Outside', short: '40/40', inside: 40, outside: 40, variationId: 5108, termSlug: '40-thumb-40-outside' },
  { label: '45 Thumb / 45 Outside', short: '45/45', inside: 45, outside: 45, variationId: 5109, termSlug: '45-thumb-45-outside' },
  { label: '45 Thumb / 55 Outside', short: '45/55', inside: 45, outside: 55, variationId: 5110, termSlug: '45-thumb-55-outside' },
  { label: '50 Thumb / 50 Outside', short: '50/50', inside: 50, outside: 50, variationId: 5111, termSlug: '50-thumb-50-outside' },
  { label: '55 Thumb / 35 Outside', short: '55/35', inside: 55, outside: 35, variationId: 6081, termSlug: '55-thumb-35-outside' },
  { label: '55 Thumb / 45 Outside', short: '55/45', inside: 55, outside: 45, variationId: 5197, termSlug: '55-thumb-45-outside' },
  { label: '55 Thumb / 55 Outside', short: '55/55', inside: 55, outside: 55, variationId: 5198, termSlug: '55-thumb-55-outside' },
] as const;

export interface ColourOption {
  label: string;
  variationId: number;
  termSlug: string;
  /** Swatch colour. */
  hex: string;
}

/** Watchdog Rim Cylinder Lock (product 5112) — 2 finishes. */
export const RIM_COLOURS: readonly ColourOption[] = [
  { label: 'Brass', variationId: 5137, termSlug: 'brass', hex: '#C9A24A' },
  { label: 'Nickel', variationId: 5138, termSlug: 'nickel', hex: '#B9BCC0' },
] as const;

/** Every variation ID we know about, keyed by parent product ID. */
export const VARIATIONS_BY_PRODUCT: Readonly<Record<number, readonly number[]>> = {
  [PRODUCT_IDS.CYLINDER_LOCK]: CYLINDER_SIZES.map((s) => s.variationId),
  [PRODUCT_IDS.THUMB_TURN]: THUMB_SIZES.map((s) => s.variationId),
  [PRODUCT_IDS.RIM_CYLINDER]: RIM_COLOURS.map((c) => c.variationId),
};

/** Set of every purchasable ID (simple product IDs + variation IDs). Used for proxy input validation. */
export const PURCHASABLE_IDS: ReadonlySet<number> = new Set<number>([
  ...CATALOGUE.filter((p) => p.type === 'simple').map((p) => p.id),
  ...Object.values(VARIATIONS_BY_PRODUCT).flat(),
]);

export const MAX_CART_QUANTITY = 99;

/**
 * Products the Store API cannot add because WooCommerce requires extra per-order fields
 * (4266 "Extra Keys" needs an "Existing Key Number"). These link out to the WooCommerce product page.
 */
export const EXTERNAL_ONLY_PRODUCT_IDS: ReadonlySet<number> = new Set<number>([PRODUCT_IDS.EXTRA_KEYS_3]);
