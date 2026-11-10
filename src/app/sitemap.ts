import type { MetadataRoute } from 'next';
import { SITE_URL, CATALOGUE } from '@/lib/constants';
import { getProductsSSR } from '@/lib/api';
import { getPosts } from '@/lib/wp';

/** sitemap.xml — homepage, products index and all product pages. Slugs come from the Store API with the static catalogue as fallback. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const live = await getProductsSSR();
  const posts = await getPosts();
  const slugs = new Set<string>(CATALOGUE.map((p) => p.slug));
  for (const p of live) {
    const entry = CATALOGUE.find((c) => c.id === p.id);
    slugs.add(entry?.slug ?? p.slug);
  }

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/home-truths`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/guarantee`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/trade`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: new Date(p.modified), changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...Array.from(slugs).map((slug) => ({
      url: `${SITE_URL}/products/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
