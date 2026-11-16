import type { NextConfig } from 'next';
import { legacyRedirects } from './legacy-redirects';

const WC_HOST = new URL(process.env.NEXT_PUBLIC_WC_BASE ?? 'https://wdlocks.co.uk').host;
const isDev = process.env.NODE_ENV === 'development';
/** Cloudflare Turnstile (src/hooks/useTurnstile.tsx) is allowed only on builds that have its site key. */
const TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ? ' https://challenges.cloudflare.com' : '';

/**
 * Content-Security-Policy.
 * - script-src needs 'unsafe-inline' because the pages are statically generated (no per-request nonce
 *   is possible without opting every route into dynamic rendering). Tighten with nonces via proxy.ts
 *   if you later switch to dynamic rendering.
 * - style-src 'unsafe-inline' is required by framer-motion (inline style attributes) and next/font.
 * - img-src / connect-src allow the WooCommerce host for product images and client-side product reads.
 * - form-action allows the checkout handoff to wdlocks.co.uk.
 * - Stripe (checkout on our domain, docs/stripe-checkout-plan.md §3d): js.stripe.com + *.js.stripe.com load
 *   Stripe.js / Elements, m.stripe.network is its fraud-signal frame, api/q/r.stripe.com are its XHR targets,
 *   hooks.stripe.com + checkout.stripe.com host 3DS / redirect frames, *.stripe.com serves wallet brand images.
 * - Turnstile (bot check on checkout + forms, only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set): challenges.cloudflare.com
 *   serves its script and its challenge frame.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.stripe.com https://*.js.stripe.com https://m.stripe.network${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${WC_HOST} https://*.stripe.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://${WC_HOST} https://api.stripe.com https://m.stripe.network https://q.stripe.com https://r.stripe.com${isDev ? ' ws: wss:' : ''}`,
  // The Home Truths crime checker embeds an OpenStreetMap frame centred on the searched postcode.
  // youtube-nocookie: the Sky Sports advert on the homepage ("How we protect you").
  `frame-src https://www.openstreetmap.org https://www.youtube-nocookie.com https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://checkout.stripe.com${TURNSTILE}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' https://${WC_HOST}`,
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // geolocation: crime checker "Use my location"; payment: Apple Pay / Google Pay through Stripe's frame.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://js.stripe.com")' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Tailwind CSS v4 runs as a Turbopack loader (no PostCSS config needed).
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: WC_HOST, pathname: '/wp-content/uploads/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536],
    imageSizes: [64, 80, 128, 256],
    // Product photos change rarely; keep optimised variants for 31 days so they are not re-transformed daily
    // (every fresh transformation costs ~0.4 s and a Vercel transformation credit). One quality = fewer variants.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    qualities: [75, 85],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      // Brand films/renders are static and large: let browsers keep them for a week instead of revalidating every visit.
      { source: '/brand/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
  async redirects() {
    // Every URL from the old WordPress sitemap → its new home (see legacy-redirects.ts)
    return legacyRedirects;
  },
};

export default nextConfig;
