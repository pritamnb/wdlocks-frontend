/**
 * Server-side data helpers for static generation / ISR.
 * Uses Next.js fetch caching with a 60s revalidate window.
 * Only import from server components, route handlers, sitemap/robots.
 */
import { getCatalogueProducts, getProduct, getProductBySlug, StoreApiError } from '@/lib/wdlocks-api';
import { CATALOGUE } from '@/lib/constants';
import type { WooProduct } from '@/types';

const REVALIDATE_SECONDS = 60;
const ssrInit: RequestInit & { next: { revalidate: number } } = {
  next: { revalidate: REVALIDATE_SECONDS },
};

/** All 9 catalogue products for the homepage/products listing. Never throws: returns [] on upstream failure. */
export async function getProductsSSR(): Promise<WooProduct[]> {
  try {
    return await getCatalogueProducts(ssrInit);
  } catch (err) {
    console.error('[api] getProductsSSR failed', err);
    return [];
  }
}

/** Single product by numeric ID. Returns null on 404; rethrows other errors so the page can error out. */
export async function getProductSSR(id: number): Promise<WooProduct | null> {
  try {
    return await getProduct(id, ssrInit);
  } catch (err) {
    if (err instanceof StoreApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getProductBySlugSSR(slug: string): Promise<WooProduct | null> {
  try {
    return await getProductBySlug(slug, ssrInit);
  } catch (err) {
    if (err instanceof StoreApiError && err.status === 404) return null;
    throw err;
  }
}

/** Slugs for generateStaticParams — static catalogue so builds don't depend on the upstream being up. */
export function getProductSlugs(): string[] {
  return CATALOGUE.map((p) => p.slug);
}
