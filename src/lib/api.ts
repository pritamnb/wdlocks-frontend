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

/**
 * Last catalogue that came back healthy from the Store API, per server instance. Shared hosting hiccups during an
 * ISR regeneration used to cache an EMPTY grid ("Products are temporarily unavailable") for a minute; now a failed
 * refresh serves the previous catalogue instead.
 */
let lastGoodCatalogue: WooProduct[] | null = null;

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof StoreApiError && err.status >= 400 && err.status < 500) break; // not transient
    }
  }
  throw lastErr;
}

/** All 9 catalogue products for the homepage/products listing. Never throws: falls back to the last good list, then []. */
export async function getProductsSSR(): Promise<WooProduct[]> {
  try {
    const products = await withRetry(() => getCatalogueProducts(ssrInit));
    if (products.length > 0) lastGoodCatalogue = products;
    return products.length > 0 ? products : (lastGoodCatalogue ?? products);
  } catch (err) {
    console.error('[api] getProductsSSR failed', err);
    return lastGoodCatalogue ?? [];
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
