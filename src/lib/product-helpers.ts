import {
  SWATCH_HEX,
  EXTERNAL_ONLY_PRODUCT_IDS,
  BRAND_RENDERS,
  EXTRA_GALLERY_RENDERS,
  PRIMARY_IMAGE_OVERRIDES,
} from '@/lib/constants';
import { variationsOf, parentProductIdOf } from '@/lib/catalogue';
import type { WooImage } from '@/types';
import type { WooProduct } from '@/types';

export interface VariationOption {
  variationId: number;
  label: string;
  short: string;
  /** Attribute taxonomy + term slug sent to the cart API. */
  attribute: string;
  termSlug: string;
  /** Extra data for swatch rendering. */
  inside?: number | null;
  outside?: number;
  hex?: string;
  /** False when the live product no longer lists this variation (removed/out of stock). */
  available: boolean;
}

export type OptionKind = 'size' | 'colour' | 'generic';

export interface VariationModel {
  kind: OptionKind;
  /** Heading shown above the swatches, e.g. "Choose your lock size". */
  heading: string;
  /** Inside-measurement wording: "Inside" (cylinder) or "Thumb turn side" (thumb turn). */
  insideLabel: string;
  options: VariationOption[];
}

/** "30 Inside / 35 Outside" → { inside: 30, outside: 35 }; "10 / 35 Outside" → { 10, 35 }; null when not a size. */
function parseSize(label: string): { inside: number; outside: number } | null {
  const n = label.match(/\d+/g);
  return n && n.length >= 2 ? { inside: Number(n[0]), outside: Number(n[1]) } : null;
}

/**
 * Builds the selectable options for a variable product from WooCommerce's own data: one option per variation the
 * Store API lists, labelled with the attribute term's name and ordered as the terms are ordered in WooCommerce. A size
 * attribute (terms like "35 Inside / 35 Outside") gets the inside/outside pickers, a colour attribute gets swatches,
 * anything else a plain list. Nothing here names a variation id, so sizes added or removed in WordPress follow.
 */
export function getVariationModel(product: WooProduct): VariationModel | null {
  if (product.type !== 'variable') return null;
  const variations = variationsOf(product);
  if (variations.length === 0) return null;
  const attr = product.attributes.find((a) => a.has_variations);
  const termOrder = new Map((attr?.terms ?? []).map((t, i) => [t.slug, i]));
  variations.sort((x, y) => (termOrder.get(x.termSlug) ?? 999) - (termOrder.get(y.termSlug) ?? 999));

  const taxonomy = variations[0].attribute;
  const sizes = variations.map((v) => parseSize(v.label));
  const isSize = /size/i.test(taxonomy) || /size/i.test(attr?.name ?? '') || sizes.every(Boolean);
  if (isSize && sizes.every(Boolean)) {
    const thumb = variations.some((v) => /thumb/i.test(v.label));
    return {
      kind: 'size',
      heading: 'Choose your lock size',
      insideLabel: thumb ? 'Thumb turn (inside)' : 'Inside',
      options: variations.map((v, i) => ({
        variationId: v.id,
        label: v.label,
        short: `${sizes[i]!.inside}/${sizes[i]!.outside}`,
        attribute: v.attribute,
        termSlug: v.termSlug,
        inside: sizes[i]!.inside,
        outside: sizes[i]!.outside,
        available: true,
      })),
    };
  }

  const isColour = /colou?r|finish/i.test(taxonomy) || /colou?r|finish/i.test(attr?.name ?? '');
  return {
    kind: isColour ? 'colour' : 'generic',
    heading: isColour ? 'Choose your finish' : `Choose ${attr?.name?.toLowerCase() ?? 'an option'}`,
    insideLabel: 'Inside',
    options: variations.map((v) => ({
      variationId: v.id,
      label: v.label,
      short: v.label,
      attribute: v.attribute,
      termSlug: v.termSlug,
      ...(isColour ? { hex: SWATCH_HEX[v.termSlug] ?? '#D9D4CC' } : {}),
      available: true,
    })),
  };
}

/** Our product page URL for a product or variation id in the given product list, if it is one we sell. */
export function productHref(id: number, products: readonly WooProduct[]): string | null {
  const productId = parentProductIdOf(id, products) ?? id;
  const product = products.find((p) => p.id === productId);
  return product ? `/products/${product.slug}` : null;
}

export function primaryImage(product: WooProduct): WooImage | null {
  const o = PRIMARY_IMAGE_OVERRIDES[product.id];
  if (o) return { id: -100, src: o.src, thumbnail: o.src, srcset: '', sizes: '', name: 'override', alt: o.alt };
  return product.images[0] ?? null;
}

/** True when the product must be ordered on wdlocks.co.uk (needs fields the Store API can't send). */
export function isExternalOnly(product: WooProduct): boolean {
  return EXTERNAL_ONLY_PRODUCT_IDS.has(product.id);
}

export function ctaLabel(product: WooProduct): string {
  if (!product.is_in_stock) return 'Out of stock';
  if (isExternalOnly(product)) return 'Order keys';
  if (product.type !== 'variable') return 'Buy now';
  return 'Buy now';
}

/** WooCommerce photos first, then the Allegion brand renders registered for this product id. */
export function galleryImagesFor(productId: number, images: WooImage[]): WooImage[] {
  const o = PRIMARY_IMAGE_OVERRIDES[productId];
  // The override replaces the first WooCommerce photo (same shot, larger) rather than duplicating it.
  const base = o ? [{ id: -100, src: o.src, thumbnail: o.src, srcset: '', sizes: '', name: 'override', alt: o.alt }, ...images.slice(1)] : images;
  const extra = EXTRA_GALLERY_RENDERS[productId] ?? [];
  const renders: WooImage[] = extra.map((key, i) => {
    const r = BRAND_RENDERS[key];
    return { id: -(i + 1), src: r.src, thumbnail: r.src, srcset: '', sizes: '', name: key, alt: r.alt };
  });
  return [...base, ...renders];
}
