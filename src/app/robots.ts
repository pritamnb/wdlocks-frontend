import type { MetadataRoute } from 'next';
import { IS_PRODUCTION_SITE, SITE_URL } from '@/lib/constants';

/**
 * Only the live site (https://wdlocks.co.uk) invites crawling and lists its sitemap. Every other build lets crawlers in
 * on purpose: they need to read the noindex on each page (and the X-Robots-Tag header from next.config.ts) to drop
 * copies they have already indexed, such as wdlocks-frontend.vercel.app. A Disallow would hide that noindex.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_SITE) return { rules: [{ userAgent: '*', allow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
