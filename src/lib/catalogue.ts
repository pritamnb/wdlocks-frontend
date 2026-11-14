/**
 * The product catalogue, built from what WooCommerce says (works in server and client components).
 *
 * Which products exist, their names, slugs, categories, prices, stock, photos, sizes and finishes all come from the
 * Store API, the same database wdlocks.co.uk renders its own pages from. Adding, removing or editing a product in
 * WordPress admin therefore changes this site with no code change. The only per-product data kept in code is
 * presentation the store does not hold: the short menu names, marketing blurbs, "Popular" badges, the preferred
 * order and swatch colours (PRODUCT_EXTRAS, PRODUCT_ORDER, SWATCH_HEX in constants.ts). A product with no entry
 * there still shows, with a name and blurb derived from WooCommerce.
 */
import type { WooProduct } from '@/types';
import { PRODUCT_EXTRAS, PRODUCT_ORDER } from '@/lib/constants';
import { decodeEntities, formatPrice, stripHtml } from '@/lib/wdlocks-api';

export interface CatalogueEntry {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  type: string;
  /** First WooCommerce category name ("Euro Cylinder Lock"), or the extras override. */
  category: string;
  /** Short line for the mega-menu and cards. */
  blurb: string;
  /** Shows a "Popular" badge on cards and in the mega-menu. */
  popular: boolean;
}

/** Products in the preferred order: ids listed in PRODUCT_ORDER first, then the rest in WooCommerce's own order. */
export function sortProducts<T extends { id: number }>(products: readonly T[]): T[] {
  const rank = (id: number) => {
    const i = PRODUCT_ORDER.indexOf(id);
    return i === -1 ? PRODUCT_ORDER.length : i;
  };
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p.id) - rank(b.p.id) || a.i - b.i)
    .map(({ p }) => p);
}

/** "Watchdog 3 Star ALPS | Lock Lubricant" → "3 Star ALPS Lock Lubricant": a fallback menu name. */
function deriveShortName(name: string): string {
  return decodeEntities(name).replace(/^Watchdog\s+/i, '').replace(/\s*\|\s*/g, ' ').trim();
}

export function catalogueEntry(product: WooProduct): CatalogueEntry {
  const extras = PRODUCT_EXTRAS[product.id];
  const price = formatPrice(product.prices.price, { minorUnit: product.prices.currency_minor_unit });
  const fallbackBlurb = stripHtml(product.short_description || product.description || '', 70);
  return {
    id: product.id,
    slug: product.slug,
    name: decodeEntities(product.name),
    shortName: extras?.shortName ?? deriveShortName(product.name),
    type: product.type,
    category: extras?.category ?? decodeEntities(product.categories?.[0]?.name ?? ''),
    blurb: (extras?.blurb ?? fallbackBlurb).replace('{price}', price),
    popular: extras?.popular ?? false,
  };
}

/* ---------------------------------------------------------------------------
 * Variations
 * ------------------------------------------------------------------------- */

export interface VariationInfo {
  id: number;
  /** Parent (variable) product id. */
  parent: number;
  /** Attribute taxonomy ("pa_locksize") — what the order line needs. */
  attribute: string;
  /** Attribute label as WooCommerce names it ("Lock Size", "Colour"). */
  attributeName: string;
  /** Term slug ("35-inside-35-outside"). */
  termSlug: string;
  /** Term name as shown on the store ("35 Inside / 35 Outside"). */
  label: string;
}

/**
 * Every variation of the given products, read from each product's `variations` list and attribute terms. Covers
 * the single-attribute products this store sells (size or finish); a variation with several attributes is labelled
 * with them joined.
 */
export function variationsOf(product: WooProduct): VariationInfo[] {
  if (product.type !== 'variable' || !product.variations?.length) return [];
  const attrs = product.attributes.filter((a) => a.has_variations);
  return product.variations.map((v) => {
    const parts = v.attributes.map((va) => {
      const attr = attrs.find((a) => a.name === va.name) ?? attrs.find((a) => a.taxonomy === va.name);
      const term = attr?.terms.find((t) => t.slug === va.value);
      return {
        attribute: attr?.taxonomy ?? va.name,
        attributeName: attr?.name ?? va.name,
        termSlug: va.value,
        label: decodeEntities(term?.name ?? va.value),
      };
    });
    const first = parts[0] ?? { attribute: '', attributeName: 'Option', termSlug: '', label: '' };
    return {
      id: v.id,
      parent: product.id,
      attribute: first.attribute,
      attributeName: first.attributeName,
      termSlug: first.termSlug,
      label: parts.map((p) => p.label).join(', '),
    };
  });
}

const indexCache = new WeakMap<readonly WooProduct[], Map<number, VariationInfo>>();

/** Variation id → info for a product list (memoised per list). */
export function variationIndex(products: readonly WooProduct[]): Map<number, VariationInfo> {
  let index = indexCache.get(products);
  if (!index) {
    index = new Map(products.flatMap((p) => variationsOf(p).map((v) => [v.id, v] as const)));
    indexCache.set(products, index);
  }
  return index;
}

/** Parent product id for a variation id, null for simple products and ids not in the list. */
export function parentProductIdOf(id: number, products: readonly WooProduct[]): number | null {
  return variationIndex(products).get(id)?.parent ?? null;
}

/** Human label for a variation id ({ attribute: 'Lock Size', value: '35 Inside / 35 Outside' }). */
export function variationLabel(id: number, products: readonly WooProduct[]): { attribute: string; value: string } | null {
  const v = variationIndex(products).get(id);
  return v ? { attribute: v.attributeName, value: v.label } : null;
}

/**
 * Up to `max` products for a menu group: the preferred ids that WooCommerce still sells, then other products from the
 * group's WooCommerce categories, so a product added in WordPress appears in its group's menu.
 */
export function menuGroupProducts(
  group: { featured: readonly number[]; categories: readonly string[] },
  products: readonly WooProduct[],
  max = 4,
): WooProduct[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const preferred = group.featured.map((id) => byId.get(id)).filter((p): p is WooProduct => Boolean(p));
  const taken = new Set(preferred.map((p) => p.id));
  const fill = products.filter((p) => !taken.has(p.id) && p.categories?.some((c) => group.categories.includes(c.slug)));
  return [...preferred, ...fill].slice(0, max);
}
