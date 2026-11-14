/**
 * Server-side data helpers for static generation / ISR.
 * Uses Next.js fetch caching with a 60s revalidate window.
 * Only import from server components, route handlers, sitemap/robots.
 */
import { getAllProducts, getProduct, getProductBySlug, getVariationsByIds, StoreApiError, stripHtml } from '@/lib/wdlocks-api';
import { sortProducts } from '@/lib/catalogue';
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

/**
 * Every product WooCommerce sells, in the preferred shop order (src/lib/catalogue.ts). Adding or removing a product in
 * WordPress shows here within a minute. Never throws: falls back to the last good list, then [].
 */
export async function getProductsSSR(): Promise<WooProduct[]> {
  try {
    const products = sortProducts(await withRetry(() => getAllProducts(ssrInit)));
    if (products.length > 0) lastGoodCatalogue = products;
    return products.length > 0 ? products : (lastGoodCatalogue ?? products);
  } catch (err) {
    console.error('[api] getProductsSSR failed', err);
    return lastGoodCatalogue ?? [];
  }
}

/**
 * Trimmed products for the site chrome (menus, basket upsells). The layout and the page both serialise their product
 * props into the RSC payload; the full objects (descriptions, 17 variations each) made the home HTML ~226 KB of JSON
 * twice over. Keep only what Navbar/MegaMenu/MobileMenu/CartDrawer read.
 */
export async function getMenuProductsSSR(): Promise<WooProduct[]> {
  const products = await getProductsSSR();
  return products.map((p) => ({
    ...p,
    description: '',
    // Plain text, short: the fallback blurb for a product with no PRODUCT_EXTRAS entry.
    short_description: stripHtml(p.short_description ?? '', 140),
    price_html: '',
    // Variation ids and the variation attributes' terms stay: the basket labels sizes and finishes from them.
    attributes: p.attributes.filter((a) => a.has_variations),
    images: p.images.slice(0, 1).map((img) => ({ ...img, srcset: '', sizes: '' })),
    extensions: {},
  }));
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

/**
 * Single product by slug. 404 → null. Any other upstream failure (after storeFetch's own retries) falls back to the
 * same product from the catalogue list call, which is one cached URL shared by every page of a build and by the
 * homepage, so a rate-limited build still renders every product page with live prices, images and variations instead
 * of failing the deploy. Only when that is unavailable too does the error propagate.
 */
export async function getProductBySlugSSR(slug: string): Promise<WooProduct | null> {
  try {
    return await getProductBySlug(slug, ssrInit);
  } catch (err) {
    if (err instanceof StoreApiError && err.status === 404) return null;
    {
      const fromList = (await getProductsSSR()).find((p) => p.slug === slug);
      if (fromList) {
        console.warn(`[api] product ${slug} served from the catalogue list after a Store API failure`, err instanceof StoreApiError ? { status: err.status, code: err.code } : err);
        return fromList;
      }
    }
    throw err;
  }
}

/** Slugs for generateStaticParams. An empty list (store unreachable at build) is fine: pages render on first visit. */
export async function getProductSlugs(): Promise<string[]> {
  return (await getProductsSSR()).map((p) => p.slug);
}

/** Link to a product page by WooCommerce id; the products listing when the store no longer sells it. */
export async function productHref(id: number): Promise<string> {
  const p = (await getProductsSSR()).find((x) => x.id === id);
  return p ? `/products/${p.slug}` : '/products';
}

/**
 * Inc-VAT price in pence per variation id for one variable product (sizes can be priced differently in WooCommerce).
 * Empty on failure: callers fall back to the product's own price.
 */
export async function getVariationPricesSSR(product: WooProduct): Promise<Record<number, number>> {
  if (product.type !== 'variable' || product.variations.length === 0) return {};
  try {
    const variations = await withRetry(() => getVariationsByIds(product.variations.map((v) => v.id), ssrInit));
    return Object.fromEntries(
      variations
        .map((v) => [v.id, Number.parseInt(v.prices.price, 10)] as const)
        .filter(([, pence]) => Number.isInteger(pence) && pence > 0),
    );
  } catch (err) {
    console.error('[api] getVariationPricesSSR failed', err);
    return {};
  }
}
