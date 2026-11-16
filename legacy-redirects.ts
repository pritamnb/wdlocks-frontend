type Redirect = { source: string; destination: string; permanent: boolean };

/**
 * 301s for every URL the WordPress site lists in its Rank Math sitemap (wdlocks.co.uk/sitemap_index.xml,
 * audited 2026-11-16), so Google moves their ranking to the new pages at cutover instead of dropping them.
 *
 * - Shop pages go to their nearest page on this site.
 * - Locksmith service and area pages belong to the locksmith business, so they go to the matching page
 *   on wdlocksmiths.co.uk (paths taken from its own sitemap on 2026-11-16).
 *
 * Next strips the trailing slash first (308), then applies these, so sources are written without one.
 */

const LOCKSMITHS = 'https://wdlocksmiths.co.uk';

/** wdlocks.co.uk area page → wdlocksmiths.co.uk/locksmith-near-me/locksmith-<town>/ */
const AREA_PAGES: Record<string, string> = {
  'acton-locksmiths': 'acton',
  'barnet-locksmiths': 'barnet',
  'borehamwood-locksmith': 'borehamwood',
  'bushey-locksmiths': 'bushey',
  'camden-locksmiths': 'camden',
  'ealing-locksmiths': 'ealing',
  'elstree-locksmiths': 'elstree',
  'feltham-locksmiths': 'feltham',
  'finchley-locksmiths': 'finchley',
  'greenford-locksmiths': 'greenford',
  'hampstead-locksmiths': 'hampstead',
  'hanwell-locksmiths': 'hanwell',
  'harrow-locksmiths': 'harrow',
  'hayes-locksmiths': 'hayes',
  'iver-locksmiths': 'iver',
  'kensington-locksmiths': 'kensington',
  'kilburn-locksmiths': 'kilburn',
  'locksmith-london': 'london',
  'locksmith-willesden': 'willesden',
  'middlesex-locksmith': 'middlesex',
  'pinner-locksmiths': 'pinner',
  'southall-locksmiths': 'southall',
  'twickenham-locksmiths': 'twickenham',
  'uxbridge-locksmiths': 'uxbridge',
  'watford-locksmiths': 'watford',
  'wembley-locksmiths': 'wembley',
};

/** Other locksmith pages → their equivalent on wdlocksmiths.co.uk */
const LOCKSMITH_PAGES: Record<string, string> = {
  'about': '/about-watchdog-locksmiths-greenford/',
  'area-covered': '/area-covered/',
  'auto-locksmith': '/',
  'commercial-locksmith': '/commercial-locksmith/',
  'door-lock-change': '/residential-change-door-lock-services/',
  'door-lock-replacement': '/residential-change-door-lock-services/',
  'lock-out-of-home': '/residential-emergency-locksmith/',
  'locked-out-of-car': '/',
  'locksmith-near-me': '/locksmith-near-me/',
  'our-partners': '/our-partners/',
  'residential-locksmith': '/residential-general-locksmith/',
  'safe-locksmith': '/safe-locksmith/',
  'services': '/',
  'testimonials': '/testimonials/',
  'upvc-door-lock-repair': '/residential-change-door-lock-services/',
  'wd-locksmith': '/',
};

/** Old shop pages → nearest page on this site */
const SHOP_PAGES: Record<string, string> = {
  'about-us': '/',
  'contact-us': '/contact',
  'cookie-policy': '/privacy',
  'guarantee-registration': '/guarantee',
  'home': '/',
  'my-account': '/',
  'privacy-policy': '/privacy',
  'refund_returns': '/terms',
  'secure-locks': '/products',
  'terms-and-conditions': '/terms',
  'thank-you': '/',
  'trade-application': '/trade',
  'wdlocks-alps': '/products',
};

export const legacyRedirects: Redirect[] = [
  { source: '/shop', destination: '/products', permanent: true },
  { source: '/shop/:path*', destination: '/products', permanent: true },
  // WooCommerce product permalinks → our product pages (same slugs)
  { source: '/product/:slug', destination: '/products/:slug', permanent: true },
  { source: '/product-category/:path*', destination: '/products', permanent: true },
  // WordPress post categories (e.g. /category/locks/) → blog index
  { source: '/category/:path*', destination: '/blog', permanent: true },
  ...Object.entries(SHOP_PAGES).map(([from, to]) => ({ source: `/${from}`, destination: to, permanent: true })),
  ...Object.entries(AREA_PAGES).map(([from, town]) => ({
    source: `/${from}`,
    destination: `${LOCKSMITHS}/locksmith-near-me/locksmith-${town}/`,
    permanent: true,
  })),
  ...Object.entries(LOCKSMITH_PAGES).map(([from, to]) => ({ source: `/${from}`, destination: `${LOCKSMITHS}${to}`, permanent: true })),
];
