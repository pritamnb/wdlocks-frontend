import {
  CATALOGUE_BY_ID,
  CYLINDER_SIZES,
  THUMB_SIZES,
  RIM_COLOURS,
  PRODUCT_IDS,
  LOCK_SIZE_ATTRIBUTE,
  COLOUR_ATTRIBUTE,
  VARIATIONS_BY_PRODUCT,
  type CatalogueEntry,
} from '@/lib/constants';
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

/** Builds the selectable options for a variable product, cross-checked against live variation IDs. */
export function getVariationModel(product: WooProduct): VariationModel | null {
  if (product.type !== 'variable') return null;
  const live = new Set(product.variations.map((v) => v.id));

  if (product.id === PRODUCT_IDS.CYLINDER_LOCK || product.id === PRODUCT_IDS.THUMB_TURN) {
    const sizes = product.id === PRODUCT_IDS.CYLINDER_LOCK ? CYLINDER_SIZES : THUMB_SIZES;
    return {
      kind: 'size',
      heading: 'Choose your lock size',
      insideLabel: product.id === PRODUCT_IDS.THUMB_TURN ? 'Thumb turn (inside)' : 'Inside',
      options: sizes.map((s) => ({
        variationId: s.variationId,
        label: s.label,
        short: s.short,
        attribute: LOCK_SIZE_ATTRIBUTE,
        termSlug: s.termSlug,
        inside: s.inside,
        outside: s.outside,
        available: live.size === 0 || live.has(s.variationId),
      })),
    };
  }

  if (product.id === PRODUCT_IDS.RIM_CYLINDER) {
    return {
      kind: 'colour',
      heading: 'Choose your finish',
      insideLabel: 'Inside',
      options: RIM_COLOURS.map((c) => ({
        variationId: c.variationId,
        label: c.label,
        short: c.label,
        attribute: COLOUR_ATTRIBUTE,
        termSlug: c.termSlug,
        hex: c.hex,
        available: live.size === 0 || live.has(c.variationId),
      })),
    };
  }

  // Generic fallback: derive from the Store API payload (first variation attribute).
  const attr = product.attributes.find((a) => a.has_variations);
  const taxonomy = attr?.taxonomy ?? attr?.name ?? 'attribute';
  return {
    kind: 'generic',
    heading: `Choose ${attr?.name?.toLowerCase() ?? 'an option'}`,
    insideLabel: 'Inside',
    options: product.variations.map((v) => {
      const a = v.attributes[0];
      const term = attr?.terms.find((t) => t.slug === a?.value);
      return {
        variationId: v.id,
        label: term?.name ?? a?.value ?? String(v.id),
        short: term?.name ?? a?.value ?? String(v.id),
        attribute: taxonomy,
        termSlug: a?.value ?? '',
        available: true,
      };
    }),
  };
}

/** Finds the catalogue entry for a product OR one of its variation IDs. */
export function catalogueEntryForId(id: number): CatalogueEntry | undefined {
  if (CATALOGUE_BY_ID[id]) return CATALOGUE_BY_ID[id];
  for (const [parentId, variations] of Object.entries(VARIATIONS_BY_PRODUCT)) {
    if (variations.includes(id)) return CATALOGUE_BY_ID[Number(parentId)];
  }
  return undefined;
}

/** Our product page URL for a product/variation ID, if we have one. */
export function productHref(id: number): string | null {
  const entry = catalogueEntryForId(id);
  return entry ? `/products/${entry.slug}` : null;
}

export function primaryImage(product: WooProduct) {
  return product.images[0] ?? null;
}

export function ctaLabel(product: WooProduct): string {
  if (!product.is_in_stock) return 'Out of stock';
  if (product.type !== 'variable') return 'Add to basket';
  if (product.id === PRODUCT_IDS.RIM_CYLINDER) return 'Choose finish';
  return 'Choose size';
}
