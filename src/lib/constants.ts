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
  { id: 'checkatrade', label: 'Checkatrade', detail: 'Vetted and monitored', image: '/brand/checkatrade.png' },
  { id: 'sbd', label: 'Secured by Design', detail: 'Police preferred specification', image: '/brand/secured-by-design.png' },
] as const;

/** £5,000 security guarantee — registration lives on the WooCommerce site. */
export const GUARANTEE = {
  amountLabel: '£5,000',
  /** Our guarantee page (Ultion's activation layout). */
  href: '/guarantee',
  /** The WordPress (Elementor) registration form, where activations are actually recorded. */
  registerUrl: `${WC_BASE}/guarantee-registration/`,
  termsUrl: `${WC_BASE}/terms/`,
  /**
   * 'handoff': the panel explains what is needed and sends people to the WordPress form.
   * 'proxy': the full form on our page posts to /api/guarantee, which forwards to the Elementor endpoint.
   * Keep 'handoff' until a live test submission has been approved and verified.
   */
  formMode: 'proxy' as 'handoff' | 'proxy',
  form: { endpoint: `${WC_BASE}/wp-admin/admin-ajax.php`, postId: 5203, formId: '73d0ba3', refererTitle: 'Guarantee Registration | Watchdog Locks' },
  /** Key numbers are stamped on the key bow; the WordPress form's example is WD12345678. */
  keyNumberExample: 'WD12345678',
  keyNumberPattern: /^[A-Z0-9-]{4,12}$/i,
  maxKeys: 5,
  blurb: 'Once your Watchdog lock is fitted, register it with us. Registration switches on key-copy protection and activates your £5,000 security guarantee.',
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
  { label: 'Home truths', href: '/home-truths', menu: null },
  { label: 'Contact', href: '/#contact', menu: null },
] as const;

/** Mega-menu contents: featured product cards + secondary text links, per group. Keys reference CATALOGUE. */
export const MENU_GROUPS: Readonly<Record<MenuGroupId, { title: string; featured: ProductKey[]; more: Array<{ label: string; href: string; external?: boolean }>; aside: { eyebrow: string; title: string; cta: string; href: string; image?: 'keysEngraved' | 'cylinderFront' } }>> = {
  locks: {
    title: 'Locks',
    featured: ['CYLINDER_LOCK', 'THUMB_TURN', 'RIM_CYLINDER', 'HALF_CYLINDER'],
    more: [
      { label: 'All products', href: '/products' },
      { label: 'Sizing guide', href: '/products/3-star-alps-cylinder-door-lock#sizing' },
      { label: 'Keyed-alike service', href: '/products/watchdog-keyed-a-like' },
      { label: 'Trade application', href: `${WC_BASE}/trade-application/`, external: true },
    ],
    aside: { eyebrow: 'Not sure of your size?', title: 'Measure in 60 seconds.', cta: 'Open the sizing guide →', href: '/products/3-star-alps-cylinder-door-lock#sizing' },
  },
  keys: {
    title: 'Keys & Aftercare',
    featured: ['EXTRA_KEYS_3', 'EXTRA_KEYS_1', 'LUBRICANT', 'BRUNO_TEDDY'],
    more: [
      { label: 'Keyed-alike service', href: '/products/watchdog-keyed-a-like' },
      { label: 'Activate £5,000 guarantee', href: '/guarantee' },
      { label: 'Why Watchdog', href: '/#why-watchdog' },
      { label: 'Home truths', href: '/home-truths' },
      { label: 'Contact us', href: '/#contact' },
    ],
    aside: { eyebrow: 'Lost a key?', title: 'Extra keys cut to your key number.', cta: 'Order extra keys →', href: '/products/watchdog-3-star-alps-extra-keys', image: 'keysEngraved' },
  },
};

/* ---------------------------------------------------------------------------
 * Brand renders supplied by Allegion (Phil Else) via Watchdog Fire & Security, 10 Nov 2026.
 * Transparent PNGs trimmed and resized; sources kept in the client's email thread
 * "watchdog lock images required". The Ultion-branded "1-Star PLUS" render was NOT used.
 * ------------------------------------------------------------------------- */
export const BRAND_RENDERS = {
  /** Full cylinder, angled, red cam, Kitemark markings — hero and gallery. */
  cylinderAngled: { src: '/brand/product/cylinder-angled.png', width: 793, height: 589, alt: 'Watchdog 3 Star ALPS euro cylinder with red anti-snap cam and BSI Kitemark markings' },
  /** Close-up of the engraved Watchdog / Brisant Secure / Sold Secure SS312 markings. */
  cylinderDetail: { src: '/brand/product/cylinder-detail.png', width: 928, height: 814, alt: 'Close-up of the Watchdog cylinder engraving: 3 Star Kitemark, Sold Secure SS312, powered by Brisant Secure' },
  /** End-on view: brass plug, red cam, 3 stars and Kitemark heart. */
  cylinderFront: { src: '/brand/product/cylinder-front.png', width: 470, height: 900, alt: 'Front view of the Watchdog cylinder showing the 3 Star Kitemark and red cam' },
  /** Three engraved Watchdog Locksmiths keys on a ring. */
  keysEngraved: { src: '/brand/product/keys-engraved.png', width: 928, height: 1000, alt: 'Three Watchdog dimple keys engraved with Watchdog Locksmiths 0800 389 9965' },
  /** 5000 px Watchdog cylinder render from Vijay's 6 Nov transfer (ALPS_Bridge-Watchdog-Key-Key.png), trimmed to 1600 px. */
  heroCylinder: { src: '/brand/product/cylinder-hero.png', width: 1600, height: 1139, alt: 'Watchdog 3 Star ALPS euro cylinder with red anti-snap cam and BSI Kitemark markings' },
  /** X-ray render of the Watchdog cylinder showing the pin stack and springs (black background). */
  cylinderXray: { src: '/brand/product/cylinder-xray.jpg', width: 1400, height: 878, alt: 'X-ray view of the Watchdog cylinder showing the eleven pins, springs and red ALPS cam inside the body' },
  /** Side-on Watchdog cylinder render (brochure email, 6 Nov), used for sizing/fitting contexts. */
  cylinderSide: { src: '/brand/product/cylinder-side.png', width: 1200, height: 535, alt: 'Watchdog 3 Star ALPS cylinder seen side-on, showing the red cam and engraved markings' },
  /** Single Watchdog key, "Watchdog Stays Locked" bow. */
  keySingle: { src: '/brand/product/key-single.png', width: 734, height: 1000, alt: 'A single Watchdog dimple key with the Watchdog Stays Locked bow' },
  /** Key tag: Stays Locked, £5000 guarantee, activate at wdlocks.co.uk. */
  guaranteeKeytag: { src: '/brand/product/guarantee-keytag.png', width: 754, height: 900, alt: 'Watchdog key tag: if a burglar snaps your lock and breaks in, £5,000 guarantee, activate for free at wdlocks.co.uk' },
} as const;

/** Manufacturer turntable animation (10 s, silent, black background). Encoded from client-assets/wetransfer-2026-11-10. */
export const BRAND_VIDEO = {
  /** 2 s exploded-view animation of the cylinder (client file home-lock-exploded.mp4, 10 Nov). All-intra encode so it can be scrubbed by scroll; background lifted to white for multiply blending. */
  exploded: {
    mp4: '/brand/video/exploded.mp4',
    poster: '/brand/video/exploded-poster.jpg',
    endPoster: '/brand/video/exploded-end.jpg',
    duration: 2,
    alt: 'The Watchdog 3 Star cylinder flying apart into its housing, plug, eleven pins, springs, anti-drill inserts and the red ALPS cam',
  },
  turntable: {
    mp4: '/brand/video/turntable.mp4',
    poster: '/brand/video/turntable-poster.jpg',
    alt: 'Watchdog 3 Star cylinder rotating slowly to show the engraved Kitemark, TS 007 and Sold Secure markings',
  },
  /** Full 40 s manufacturer explainer, 720p with sound — click to play only. */
  film: {
    mp4: '/brand/video/watchdog-film.mp4',
    poster: '/brand/video/watchdog-film-poster.jpg',
    title: 'How a Watchdog lock works',
    durationLabel: '0:40',
    durationIso: 'PT40S',
    chapters: 'Dimple and snake key · 11 pins, 870,000 combinations · Always Locked Protection System · engraved markings.',
  },
  /** The explainer cut for inline play: 7–40 s (dark intro removed), white fades at both ends so it multiply-blends onto cream. */
  explainerInline: {
    mp4: '/brand/video/explainer-inline.mp4',
    poster: '/brand/video/explainer-inline-poster.jpg',
    title: 'How a Watchdog lock works',
    durationLabel: '0:33',
    chapterList: [
      { t: 0, label: '0:00', title: 'High-security dimple and snake key' },
      { t: 4, label: '0:04', title: '11 pins, 870,000 unique combinations' },
      { t: 9, label: '0:09', title: 'The pin stack lifts to the key' },
      { t: 13, label: '0:13', title: 'The ALPS cam engages' },
      { t: 19, label: '0:19', title: 'Always Locked Protection System' },
      { t: 25, label: '0:25', title: 'Engraved Kitemark and Sold Secure marks' },
      { t: 29, label: '0:29', title: 'Patented ALPS security' },
    ],
  },
  /** 38 s macro journey inside the cylinder (Vijay, 6 Nov): pick protection, thermal exhaust ports, pin stack. With sound. */
  insideFilm: {
    mp4: '/brand/video/inside-film.mp4',
    poster: '/brand/video/inside-film-poster.jpg',
    title: 'Inside the lock',
    durationLabel: '0:38',
    durationIso: 'PT38S',
    chapters: 'A camera journey through the cylinder: the pin chambers, anti-pick springs, thermal exhaust ports and the engraved body.',
    /** Seek points matching the callouts baked into the footage. */
    chapterList: [
      { t: 0, label: '0:00', title: 'Inside the pin chambers' },
      { t: 10, label: '0:10', title: 'TwistTrap technology' },
      { t: 18, label: '0:18', title: 'SnapStop protection' },
      { t: 20, label: '0:20', title: 'Hardened steel drill protection' },
      { t: 22, label: '0:22', title: 'Pick-protection springs' },
      { t: 30, label: '0:30', title: 'More hardened steel, then the keyway' },
      { t: 32, label: '0:32', title: 'Thermal exhaust ports' },
      { t: 34, label: '0:34', title: 'Engraved: Watchdog, powered by Brisant Secure' },
    ],
  },
  /** Silent chapter cuts from the film, faded to white at both ends so they can be multiply-blended onto cream. */
  clips: {
    dimpleKey: { mp4: '/brand/video/clip-dimple-key.mp4', poster: '/brand/video/clip-dimple-key-poster.jpg', alt: 'A dimple and snake key sliding into a cut-away Watchdog cylinder' },
    pins: { mp4: '/brand/video/clip-pins.mp4', poster: '/brand/video/clip-pins-poster.jpg', alt: 'Cut-away of the eleven colour-coded pins inside the Watchdog cylinder lifting as the key enters' },
    alps: { mp4: '/brand/video/clip-alps.mp4', poster: '/brand/video/clip-alps-poster.jpg', alt: 'Cut-away of the red cam and Always Locked Protection System engaging inside the cylinder' },
    /** Watchdog key turning on a black turntable (10 s, from Vijay's 6 Nov transfer). Use with blend="plain" on a dark panel. */
    keyTurntable: { mp4: '/brand/video/key-turntable.mp4', poster: '/brand/video/key-turntable-poster.jpg', alt: 'A Watchdog Stays Locked key rotating slowly to show the dimple cuts and snake groove' },
  },
} as const;

export type ClipId = keyof typeof BRAND_VIDEO.clips;

export interface VideoBarEntry {
  id: string;
  title: string;
  durationLabel: string;
  poster: string;
  mp4: string;
  aspect: '16/9' | '5/4';
  blurb: string;
}

/** "See Watchdog in action" cards, in display order. Client-supplied films only. */
export const VIDEO_BAR: ReadonlyArray<VideoBarEntry> = [
  { id: 'explainer', title: 'How a Watchdog lock works', durationLabel: '00:40', poster: BRAND_VIDEO.film.poster, mp4: BRAND_VIDEO.film.mp4, aspect: '16/9', blurb: 'Manufacturer film. ' + BRAND_VIDEO.film.chapters },
  { id: 'inside', title: 'Inside the lock', durationLabel: '00:38', poster: BRAND_VIDEO.insideFilm.poster, mp4: BRAND_VIDEO.insideFilm.mp4, aspect: '5/4', blurb: 'Manufacturer film. ' + BRAND_VIDEO.insideFilm.chapters },
  { id: 'turntable', title: 'Every angle, every mark', durationLabel: '00:10', poster: BRAND_VIDEO.turntable.poster, mp4: BRAND_VIDEO.turntable.mp4, aspect: '16/9', blurb: 'Silent 3D turntable of the 3 Star ALPS cylinder showing the engraved Kitemark, TS 007 and Sold Secure marks.' },
  { id: 'key', title: 'The Watchdog key', durationLabel: '00:10', poster: BRAND_VIDEO.clips.keyTurntable.poster, mp4: BRAND_VIDEO.clips.keyTurntable.mp4, aspect: '16/9', blurb: 'Silent 3D turntable of the Watchdog Stays Locked key: dimple cuts and snake groove.' },
];


export type FilmId = 'explainer' | 'inside';

/** Client brochure (Brisant/Allegion, 2025 v2), 4 pages. */
export const BROCHURE = { href: '/brand/watchdog-brochure.pdf', label: 'Watchdog brochure (PDF, 7 MB)', issuu: 'https://issuu.com/brisant-secure/docs/watchdog_brochure_2025-2' } as const;

/** Silent chapter clip that plays when a product card or menu tile is hovered. */
export const CARD_HOVER_CLIPS: Readonly<Partial<Record<number, ClipId>>> = {
  [PRODUCT_IDS.CYLINDER_LOCK]: 'alps',
  [PRODUCT_IDS.THUMB_TURN]: 'pins',
  [PRODUCT_IDS.HALF_CYLINDER]: 'pins',
  [PRODUCT_IDS.EXTRA_KEYS_3]: 'dimpleKey',
  [PRODUCT_IDS.EXTRA_KEYS_1]: 'dimpleKey',
  [PRODUCT_IDS.KEYED_ALIKE]: 'dimpleKey',
};

/** Ultion-style header pills and benefit bullets per product (falls back to the WooCommerce short description). */
export const PRODUCT_PILLS: Readonly<Partial<Record<number, string[]>>> = {
  [PRODUCT_IDS.CYLINDER_LOCK]: ['TS 007 3★ certified', 'Anti-snap'],
  [PRODUCT_IDS.THUMB_TURN]: ['TS 007 3★ certified', 'Anti-snap'],
  [PRODUCT_IDS.HALF_CYLINDER]: ['TS 007 3★ certified', 'Anti-snap'],
  [PRODUCT_IDS.RIM_CYLINDER]: ['Nightlatch cylinder', 'Brass or nickel'],
  [PRODUCT_IDS.EXTRA_KEYS_3]: ['Genuine Watchdog key', 'Cut to your number'],
  [PRODUCT_IDS.EXTRA_KEYS_1]: ['Genuine Watchdog key', 'Precision cut'],
  [PRODUCT_IDS.KEYED_ALIKE]: ['One key, every door', 'Service'],
  [PRODUCT_IDS.LUBRICANT]: ['Approved for Watchdog', 'Every 6 months'],
  [PRODUCT_IDS.BRUNO_TEDDY]: ['Blocks relay theft', 'Fits every car key'],
};
export const PRODUCT_BULLETS: Readonly<Partial<Record<number, string[]>>> = {
  [PRODUCT_IDS.CYLINDER_LOCK]: [
    '£5,000 security guarantee on registration.',
    'Sold Secure Diamond. Tested and approved by locksmiths.',
    'Police Preferred Specification. Secured by Design.',
    'BSI Kitemark TS 007 3 Star, the highest cylinder rating.',
    '11 pins and 800,000+ combinations; hardened anti-drill inserts.',
    'ALPS locks the cam the instant you remove your key.',
  ],
  [PRODUCT_IDS.THUMB_TURN]: [
    '£5,000 security guarantee on registration.',
    'Sold Secure Diamond. Tested and approved by locksmiths.',
    'Police Preferred Specification. Secured by Design.',
    'BSI Kitemark TS 007 3 Star, the highest cylinder rating.',
    'Thumb turn inside: no key needed to get out in an emergency.',
    'ALPS locks the cam the instant you remove your key.',
  ],
  [PRODUCT_IDS.EXTRA_KEYS_3]: [
    'Genuine Watchdog key from the manufacturer.',
    'Keeps your £5,000 guarantee valid.',
    'Cut only against the number stamped on your key.',
    'Dimple and snake-groove profile, precision machine cut.',
    'Thick, durable bow stamped Watchdog Stays Locked.',
    'Dispatched the same day before 3pm.',
  ],
  [PRODUCT_IDS.EXTRA_KEYS_1]: [
    'Genuine Watchdog key from the manufacturer.',
    'For Watchdog 1 Star cylinders.',
    'Precision machine cut to the Watchdog profile.',
    'Thick, durable bow stamped Watchdog Stays Locked.',
    'Dispatched the same day before 3pm.',
  ],
  [PRODUCT_IDS.RIM_CYLINDER]: [
    'Replacement for Yale-type night latch cylinders on timber doors.',
    'Brass or satin nickel finish to match your door furniture.',
    'Three keys as standard, cut to your key number.',
    'Fits standard rim night latches; fixing screws included.',
    'Dispatched the same day before 3pm.',
  ],
  [PRODUCT_IDS.HALF_CYLINDER]: [
    'Half euro cylinder, 10mm inside / 35mm outside, for garages, shutters and key switches.',
    'Same 3 Star ALPS anti-snap body as the full cylinder.',
    'BSI Kitemark TS 007 3 Star and Sold Secure Diamond.',
    'Three keys as standard; can be keyed alike with your door locks.',
    'Dispatched the same day before 3pm.',
  ],
  [PRODUCT_IDS.KEYED_ALIKE]: [
    'Every Watchdog cylinder in your order pinned to one key number.',
    'One key for the front, back, side doors and garage.',
    'Three keys with each lock, all the same.',
    'Match locks to a key you already hold by giving us its number.',
    'Added once per order, whatever the number of locks.',
  ],
  [PRODUCT_IDS.LUBRICANT]: [
    'Approved for Watchdog and Brisant Secure cylinders.',
    'Dry graphite formula: no oil, no WD-40, no gumming.',
    'Keeps the eleven pins turning freely and protects your guarantee.',
    'Apply into the keyway every six months, or sooner if the key stiffens.',
    'Dispatched the same day before 3pm.',
  ],
  [PRODUCT_IDS.BRUNO_TEDDY]: [
    'Blocks the relay signal thieves use for keyless-entry theft.',
    'Pop your car key inside and the fob is silent to scanners.',
    'Fits every keyless fob; a soft toy on the hall table, not a metal pouch.',
    'Tested signal-blocking lining; machine washable cover.',
    'Dispatched the same day before 3pm.',
  ],
};

export interface ProductFeature {
  eyebrow: string;
  title: string;
  body: string;
  /** Optional image; the product's own photo is used when omitted. */
  image?: string;
}

/** Short H2 under the product title (Ultion: "Stops key jamming + protects guarantees"). */
export const PRODUCT_SUBTITLES: Readonly<Partial<Record<number, string>>> = {
  [PRODUCT_IDS.CYLINDER_LOCK]: 'Anti-snap, anti-bump, anti-drill. Locks itself the moment the key comes out.',
  [PRODUCT_IDS.THUMB_TURN]: 'Key outside, thumb turn inside. Same 3 Star ALPS protection.',
  [PRODUCT_IDS.RIM_CYLINDER]: 'The Yale-type night latch cylinder, in brass or nickel.',
  [PRODUCT_IDS.HALF_CYLINDER]: '3 Star protection for garages, shutters and key switches.',
  [PRODUCT_IDS.KEYED_ALIKE]: 'Same key, different locks. One key for every door.',
  [PRODUCT_IDS.LUBRICANT]: 'Stops key jamming and protects your guarantee.',
  [PRODUCT_IDS.BRUNO_TEDDY]: 'The signal blocker that looks like a teddy, not a tin.',
  [PRODUCT_IDS.EXTRA_KEYS_3]: 'Genuine keys cut to the number stamped on yours.',
  [PRODUCT_IDS.EXTRA_KEYS_1]: 'Genuine keys for Watchdog 1 Star cylinders.',
};

/** Ultion-style feature tiles for products that don't use the lock or keys sections. */
export const PRODUCT_FEATURES: Readonly<Partial<Record<number, ReadonlyArray<ProductFeature>>>> = {
  [PRODUCT_IDS.RIM_CYLINDER]: [
    { eyebrow: 'Timber doors', title: 'Made for night latches.', body: 'Drops into the standard rim night latch found on most timber front doors, replacing the old Yale-type cylinder in minutes.' },
    { eyebrow: 'Two finishes', title: 'Brass or satin nickel.', body: 'Choose the finish that matches your knocker, letterplate and handle. Both carry the Watchdog name on the face.' },
    { eyebrow: 'Your key number', title: 'Three keys, cut to you.', body: 'Every rim cylinder ships with three keys cut to your own number, so spares come from us and nobody else.', image: '/brand/product/keys-engraved.png' },
  ],
  [PRODUCT_IDS.HALF_CYLINDER]: [
    { eyebrow: 'Outbuildings', title: 'Garages, shutters, key switches.', body: 'A half cylinder works from one side only, which is exactly what a garage door, roller shutter or key switch needs.', image: '/brand/product/cylinder-side.png' },
    { eyebrow: 'Same protection', title: 'Still a 3 Star ALPS.', body: 'The 10/35 half body carries the same anti-snap section, hardened inserts and eleven-pin stack as the full cylinder.', image: '/brand/product/cylinder-detail.png' },
    { eyebrow: 'One key', title: 'Key it alike with the house.', body: 'Add the keyed-alike service and the garage opens with the same key as the front door.', image: '/brand/product/key-single.png' },
  ],
  [PRODUCT_IDS.KEYED_ALIKE]: [
    { eyebrow: 'Convenience', title: 'One key on the ring.', body: 'Front, back, side and garage on a single Watchdog key. No more fumbling for the right one in the dark.', image: '/brand/product/key-single.png' },
    { eyebrow: 'Security', title: 'No weak door.', body: 'Every door gets the same 3 Star ALPS cylinder, so a burglar cannot pick the softest lock on the house.', image: '/brand/product/cylinder-angled.png' },
    { eyebrow: 'Family', title: 'Share one key, safely.', body: 'Spares for family are cut to your number by us, never copied at a kiosk, so you always know how many exist.', image: '/brand/product/keys-engraved.png' },
  ],
  [PRODUCT_IDS.LUBRICANT]: [
    { eyebrow: 'Simple and effective', title: 'Stops key jamming.', body: 'A dry graphite formula made for precision pin cylinders. No more stuck keys or stiff turns on a cold morning.' },
    { eyebrow: 'Extra protection', title: 'Protects your guarantee.', body: 'A lubricated Watchdog is a lock in warranty. Apply every six months and the mechanical guarantee stays intact.', image: '/brand/product/guarantee-keytag.png' },
    { eyebrow: 'Tip-top condition', title: 'Smooth operator.', body: 'Spray into the keyway, work the key in and out a few times, and the eleven pins glide again. Never oil, never WD-40.', image: '/brand/product/cylinder-xray.jpg' },
  ],
  [PRODUCT_IDS.BRUNO_TEDDY]: [
    { eyebrow: 'Relay theft', title: 'Silences your key fob.', body: 'Keyless cars are stolen by relaying the fob signal from your hallway to the drive. Inside Bruno, the fob cannot be read.' },
    { eyebrow: 'Design', title: 'A teddy, not a tin.', body: 'A signal-blocking lining inside a soft toy that sits happily on the hall table, so you actually use it every night.' },
    { eyebrow: 'Everyday', title: 'Fits every fob.', body: 'Room for two keys, a washable cover, and a Watchdog tag so visitors know what it is for.' },
  ],
};


/** Products whose page shows the dimple-key chapter under the gallery. */
export const KEY_PRODUCT_IDS: ReadonlySet<number> = new Set([PRODUCT_IDS.EXTRA_KEYS_3, PRODUCT_IDS.EXTRA_KEYS_1, PRODUCT_IDS.KEYED_ALIKE]);

/** Extra gallery images appended after the WooCommerce photos on specific product pages. */
export const EXTRA_GALLERY_RENDERS: Readonly<Partial<Record<number, ReadonlyArray<keyof typeof BRAND_RENDERS>>>> = {
  [PRODUCT_IDS.CYLINDER_LOCK]: ['cylinderAngled', 'cylinderDetail', 'cylinderFront'],
  [PRODUCT_IDS.EXTRA_KEYS_3]: ['keysEngraved'],
  [PRODUCT_IDS.EXTRA_KEYS_1]: ['keysEngraved'],
  [PRODUCT_IDS.KEYED_ALIKE]: ['keysEngraved'],
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
    blurb: 'Cut to your key number. £12 per key.',
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

/**
 * Home truths. Every figure is from the ONS Crime Survey for England and Wales, "Nature of crime: burglary" tables,
 * year ending March 2025 (domestic burglary in a dwelling). Table references are in docs/home-truths-replication-spec.md.
 */
export const HOME_TRUTHS_SOURCE = {
  label: 'ONS Crime Survey for England and Wales, Nature of crime: burglary, year ending March 2025',
  href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/natureofcrimeburglary',
} as const;

export interface HomeTruth {
  stat: string;
  claim: string;
  title: string;
  body: string;
  source: string;
  render: keyof typeof BRAND_RENDERS;
}

export const HOME_TRUTHS: readonly HomeTruth[] = [
  {
    stat: '63%',
    claim: 'of burglaries happen while someone is at home',
    title: 'You are not home alone.',
    body: 'Nearly two in three domestic burglaries happen with someone in the house. Your front door is not just protecting your belongings; it is protecting the people behind it.',
    source: 'Table 10a, contact with offenders, all domestic burglary in a dwelling, Apr 2024 to Mar 2025.',
    render: 'cylinderFront',
  },
  {
    stat: '77%',
    claim: 'of burglars who got in came through a door, not a window',
    title: 'Knock knock. You are only as secure as your weakest lock.',
    body: 'Doors are the burglar\u2019s first choice because they are quick. Windows account for one entry in five. Fitting a 3 Star cylinder to every external door closes the easy way in.',
    source: 'Table 3b, method of entry, burglary with entry, Apr 2024 to Mar 2025.',
    render: 'cylinderAngled',
  },
  {
    stat: '59%',
    claim: 'of break-ins with entry were at the front of the house',
    title: 'The front door. In plain sight.',
    body: 'Most burglars walk up to the front like anyone else. A cylinder that snaps in seconds is an invitation. One that locks its own cam the moment the key comes out is not.',
    source: 'Table 2b, point of entry, burglary with entry, Apr 2024 to Mar 2025.',
    render: 'cylinderDetail',
  },
  {
    stat: '74%',
    claim: 'of burglaries with entry happened in the evening or at night',
    title: 'After dark is still the burglar\u2019s hour.',
    body: 'Three in four successful break-ins are in the evening or overnight, when you are most likely to be in. Lock the door every time you close it, and make sure the lock is worth locking.',
    source: 'Table 1b, timing, burglary with entry, Apr 2024 to Mar 2025.',
    render: 'cylinderXray',
  },
  {
    stat: '1 in 4',
    claim: 'burglars simply walked through a door that was not locked',
    title: 'The best lock in the world only works when you turn the key.',
    body: 'A quarter of entries needed no force at all. Another 15% forced the lock. A Watchdog cylinder deals with the second group; the first is down to habit.',
    source: 'Table 3b, method of entry, burglary with entry: door not locked 24.5%, forced lock 14.9%, Apr 2024 to Mar 2025.',
    render: 'keysEngraved',
  },
];

/** Postcode crime checker (data.police.uk, Open Government Licence v3). */
export const CRIME_CHECKER = {
  months: 6,
  radii: [1, 3] as const,
  attribution: 'Contains public sector information licensed under the Open Government Licence v3.0. Data: data.police.uk.',
  categories: {
    'anti-social-behaviour': 'Anti-social behaviour',
    'bicycle-theft': 'Bicycle theft',
    burglary: 'Burglary',
    'criminal-damage-arson': 'Criminal damage and arson',
    drugs: 'Drugs',
    'other-theft': 'Other theft',
    'possession-of-weapons': 'Possession of weapons',
    'public-order': 'Public order',
    robbery: 'Robbery',
    shoplifting: 'Shoplifting',
    'theft-from-the-person': 'Theft from the person',
    'vehicle-crime': 'Vehicle crime',
    'violent-crime': 'Violence and sexual offences',
    'other-crime': 'Other crime',
  } as Record<string, string>,
} as const;

/** "Who's behind Watchdog": only facts with a public source (see docs/home-truths-replication-spec.md). */
export const BEHIND_WATCHDOG = {
  statement: 'There\u2019s no security test that the Watchdog lock hasn\u2019t passed with flying colours. Tested by locksmiths, and trusted by homeowners.',
  attribution: 'Watchdog Locksmiths, wdlocks.co.uk',
  facts: [
    { eyebrow: 'Made by', title: 'Brisant Secure, Dewsbury', body: 'Designed and supplied from West Yorkshire by Brisant Secure, part of Allegion since August 2025.' },
    { eyebrow: 'Fitted by', title: 'Watchdog Locksmiths, London', body: 'A team of professional locksmiths with over ten years on doors, windows and vehicle locks.' },
    { eyebrow: 'Tested to', title: 'Kitemark 3 Star, Sold Secure Diamond', body: 'BSI Kitemark TS 007 3 Star, Sold Secure Diamond and Secured by Design, the Police Preferred Specification.' },
  ],
} as const;

/** Guarantee page copy. Every condition is from clause 14 of wdlocks.co.uk/terms (read 10 Nov 2026). */
export const GUARANTEE_PAGE = {
  benefits: [
    { title: '£5,000 if a burglar snaps your lock', body: 'If a burglary happens within 5 years of installation and entry was gained by snapping your registered Watchdog lock, we pay the first £5,000 of your uninsured loss.' },
    { title: 'Key-copy protection for life', body: 'Register the number stamped on your key and nobody can order a key cut to it without your say-so.' },
    { title: 'Free, in two minutes', body: 'Your name, your email and your key number. Nothing to pay, no property address, no marketing.' },
  ],
  figures: [
    { value: '£5,000', label: 'first of your uninsured loss' },
    { value: '5 years', label: 'from the date of installation' },
    { value: '28 days', label: 'to register after fitting' },
    { value: '14 days', label: 'to submit a claim after a burglary' },
  ],
  conditions: [
    'A burglary took place at your premises and items belonging to you were stolen.',
    'The Watchdog lock that entry was gained through was installed within the five years before the incident.',
    'Entry was achieved solely by a lock-snapping attack on the registered Watchdog lock.',
    'You registered the lock on the Watchdog website within 28 days of installation.',
    'The burglary happened after the date of registration.',
    'A completed claim form, with the documents and items on its checklist, is submitted within 14 days of the incident.',
    'The lock has only ever been operated with genuine Watchdog keys.',
    'The lock has been lubricated with Lution XM every 6 months or 5,000 cycles, whichever comes first.',
    'The claim is accepted at our discretion, as set out in the terms.',
  ],
  steps: [
    { title: 'Report it', body: 'Call the police, get a crime reference number and keep the snapped cylinder exactly as you found it.' },
    { title: 'Complete the claim form', body: 'Within 14 days of the burglary. The checklist tells you which documents, photos and items to include.' },
    { title: 'Send it to us', body: 'Post the form, the snapped lock and your documents to Watchdog Locksmith Ltd, 397-399 Greenford Road, Greenford, UB6 8RF, or email sales@wdlocks.co.uk to start.' },
  ],
  faq: [
    { q: 'Do I have to register to be covered?', a: 'Yes. Registration within 28 days of installation is a condition of the guarantee, and the burglary must happen after the date you registered. It is free and takes two minutes.' },
    { q: 'Where do I find my key number?', a: 'It is stamped on the bow (the flat part you hold) of every genuine Watchdog key, for example WD12345678. It is also printed on the security card in the box.' },
    { q: 'Does the guarantee replace my home insurance?', a: 'No. It pays the first £5,000 of your uninsured loss when a burglar got in by snapping your registered Watchdog lock. Keep your contents insurance in place.' },
    { q: 'What if the burglar got in another way?', a: 'The guarantee covers lock-snapping attacks on the registered Watchdog lock only. Entry through a window, an unlocked door or another lock is not covered.' },
    { q: 'Will copied keys or no lubrication void it?', a: 'Yes. The lock must only ever have been used with genuine Watchdog keys and lubricated with Lution XM every 6 months or 5,000 cycles. Extra keys and lubricant are on this site.' },
    { q: 'How long does the guarantee last?', a: 'Five years from the date the lock was installed.' },
  ],
} as const;
