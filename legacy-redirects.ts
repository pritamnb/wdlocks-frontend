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
 *
 * Second pass 2026-11-18 (redirects and SEO handover): old product URLs WordPress itself redirects, the 10 blog guides
 * (root on WordPress, /blog/ here), product tags, /.shop/ and /my-blog/, paged testimonials and old /services/ and
 * /my-account/ sub-pages, closer locksmith targets for three pages, and five town pages that were already 404 on
 * WordPress but have a page on wdlocksmiths.co.uk. Towns with no page there stay 404.
 */

const LOCKSMITHS = 'https://wdlocksmiths.co.uk';

/** wdlocks.co.uk area page → wdlocksmiths.co.uk/locksmith-near-me/locksmith-<town>/ */
const AREA_PAGES: Record<string, string> = {
  'acton-locksmiths': 'acton',
  'barnet-locksmiths': 'barnet',
  'borehamwood-locksmith': 'borehamwood',
  'borehamwood-locksmiths': 'borehamwood',
  'bushey-locksmiths': 'bushey',
  'camden-locksmiths': 'camden',
  'chiswick-locksmiths': 'chiswick',
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
  'kilburn-locksmithss': 'kilburn', // typo URL that still gets visits
  'locksmith-london': 'london',
  'locksmith-willesden': 'willesden',
  'middlesex-locksmith': 'middlesex',
  'mill-hill-locksmiths': 'mill-hill',
  'northwood-locksmiths': 'northwood',
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
  'about-us': '/about-watchdog-locksmiths-greenford/', // written about the locksmith business, like /about/
  'area-covered': '/area-covered/',
  'auto-locksmith': '/',
  'commercial-locksmith': '/commercial-locksmith/',
  'door-lock-change': '/residential-change-door-lock-services/',
  'door-lock-replacement': '/lock-replacement/',
  'lock-out-of-home': '/residential-emergency-locksmith/',
  'locked-out-of-car': '/',
  'locksmith-near-me': '/locksmith-near-me/',
  'our-partners': '/our-partners/',
  'residential-locksmith': '/residential-general-locksmith/',
  'safe-locksmith': '/safe-locksmith/',
  'services': '/',
  'testimonials': '/testimonials/',
  'upvc-door-lock-repair': '/lock-repair-near-me/',
  'wd-locksmith': '/',
};

/** Old shop pages → nearest page on this site */
const SHOP_PAGES: Record<string, string> = {
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
  '.shop': '/products', // odd URL, but WordPress serves it and it gets search visits
  'my-blog': '/blog',
};

/** WooCommerce product URLs WordPress already 301s to a product under another slug. Must come before /product/:slug. */
const RENAMED_PRODUCTS: Record<string, string> = {
  'watchdog-3-star-alps-thumb-turn-lock': '3-star-alps-euro-cylinder-thumb-turn-lock',
  'watchdog-3-star-alps-cylinder-lock': '3-star-alps-cylinder-door-lock',
  'watchdog-keyed-a-like-master-key': 'watchdog-keyed-a-like',
};

/** Blog guides: at the site root on WordPress, under /blog/ here (same slugs). */
const BLOG_GUIDES = [
  'how-to-look-after-your-euro-cylinder-lock',
  'how-to-order-extra-keys-for-your-watchdog-lock',
  'keyed-alike-locks-explained',
  'half-cylinder-lock-guide',
  'rim-cylinder-vs-euro-cylinder-which-do-i-need',
  'thumb-turn-euro-cylinder-guide',
  'how-to-fit-a-euro-cylinder-lock-yourself',
  'anti-snap-anti-bump-anti-drill-lock-features-explained',
  '1-star-vs-3-star-euro-cylinders-ts007-explained',
  'how-to-measure-a-euro-cylinder-lock',
];

export const legacyRedirects: Redirect[] = [
  { source: '/shop', destination: '/products', permanent: true },
  { source: '/shop/:path*', destination: '/products', permanent: true },
  ...Object.entries(RENAMED_PRODUCTS).map(([from, to]) => ({ source: `/product/${from}`, destination: `/products/${to}`, permanent: true })),
  // WooCommerce product permalinks → our product pages (same slugs)
  { source: '/product/:slug', destination: '/products/:slug', permanent: true },
  { source: '/product-category/:path*', destination: '/products', permanent: true },
  { source: '/product-tag/:path*', destination: '/products', permanent: true },
  ...BLOG_GUIDES.map((slug) => ({ source: `/${slug}`, destination: `/blog/${slug}`, permanent: true })),
  // Old WooCommerce account pages (lost password etc.): there are no customer accounts here
  { source: '/my-account/:path+', destination: '/', permanent: true },
  // Paged testimonials and service sub-pages belong to the locksmith business
  { source: '/testimonials/:path+', destination: `${LOCKSMITHS}/testimonials/`, permanent: true },
  { source: '/services/:path+', destination: `${LOCKSMITHS}/`, permanent: true },
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
