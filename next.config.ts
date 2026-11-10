import type { NextConfig } from 'next';

const WC_HOST = new URL(process.env.NEXT_PUBLIC_WC_BASE ?? 'https://wdlocks.co.uk').host;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Content-Security-Policy.
 * - script-src needs 'unsafe-inline' because the pages are statically generated (no per-request nonce
 *   is possible without opting every route into dynamic rendering). Tighten with nonces via proxy.ts
 *   if you later switch to dynamic rendering.
 * - style-src 'unsafe-inline' is required by framer-motion (inline style attributes) and next/font.
 * - img-src / connect-src allow the WooCommerce host for product images and client-side product reads.
 * - form-action allows the checkout handoff to wdlocks.co.uk.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${WC_HOST}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${WC_HOST}${isDev ? ' ws: wss:' : ''}`,
  // The Home Truths crime checker embeds an OpenStreetMap frame centred on the searched postcode.
  "frame-src https://www.openstreetmap.org",
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
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' }, // geolocation: crime checker "Use my location"
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
    minimumCacheTTL: 60 * 60 * 24,
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
    ];
  },
  async redirects() {
    return [
      { source: '/shop', destination: '/products', permanent: true },
      { source: '/shop/:path*', destination: '/products', permanent: true },
      // WooCommerce product permalinks → our product pages (same slugs)
      { source: '/product/:slug', destination: '/products/:slug', permanent: true },
      { source: '/product-category/:path*', destination: '/products', permanent: true },
    ];
  },
};

export default nextConfig;
