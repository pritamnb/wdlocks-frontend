'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { WooProduct } from '@/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/useCart';
import { productPriceLabel, decodeEntities } from '@/lib/wdlocks-api';
import { primaryImage, ctaLabel, isExternalOnly } from '@/lib/product-helpers';
import { BRAND_VIDEO, CARD_HOVER_CLIPS, CATALOGUE_BY_ID } from '@/lib/constants';
import { HoverPreview } from '@/components/media/HoverPreview';
import { cn } from '@/lib/cn';

interface Props {
  product: WooProduct;
  /** Called when a variable product's CTA is pressed; the grid owns the SizePicker. */
  onChooseOptions?: (product: WooProduct, trigger: HTMLButtonElement) => void;
  priority?: boolean;
}

export function ProductCard({ product, onChooseOptions, priority = false }: Props) {
  const { addToCart } = useCart();
  const [busy, setBusy] = React.useState(false);
  const image = primaryImage(product);
  const name = decodeEntities(product.name);
  const entry = CATALOGUE_BY_ID[product.id];
  const href = `/products/${entry?.slug ?? product.slug}`;
  const isVariable = product.type === 'variable';
  const externalOnly = isExternalOnly(product);
  const hoverClip = CARD_HOVER_CLIPS[product.id];

  const onCta = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isVariable) {
      onChooseOptions?.(product, e.currentTarget);
      return;
    }
    setBusy(true);
    await addToCart({ id: product.id, quantity: 1, name });
    setBusy(false);
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-cream-dark bg-cream',
        'transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-cream-dark/80 hover:shadow-card-hover',
        'before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-[3px] before:origin-left before:scale-x-0 before:bg-red before:transition-transform before:duration-150 group-hover:before:scale-x-100 focus-within:before:scale-x-100',
      )}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden bg-warm-white" aria-label={name} tabIndex={-1}>
        {image ? (
          hoverClip ? (
            <HoverPreview src={BRAND_VIDEO.clips[hoverClip].mp4} className="absolute inset-0">
              <Image src={image.src} alt={image.alt || name} fill priority={priority} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="brighten-img object-contain p-6" />
            </HoverPreview>
          ) : (
            <Image src={image.src} alt={image.alt || name} fill priority={priority} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="brighten-img object-contain p-6" />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-charcoal/40">No image</div>
        )}
        {!product.is_in_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-near-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Out of stock</span>
        )}
        {entry?.popular && product.is_in_stock && (
          <span className="absolute right-3 top-3 rounded-full bg-red px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Popular</span>
        )}
        {product.on_sale && product.is_in_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-red px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Sale</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col items-center p-5 text-center">
        <h3 className="text-lg font-semibold leading-snug text-near-black">
          <Link href={href} className="transition-colors duration-150 hover:text-red focus-visible:text-red">
            {entry?.shortName ?? name}
          </Link>
        </h3>
        {entry?.blurb && <p className="mt-2 text-sm text-charcoal/75">{entry.blurb}</p>}
        <p className="mt-3 font-playfair text-xl font-semibold tabular-nums text-near-black">
          {isVariable && product.prices.price_range && <span className="mr-1 font-sans text-xs font-normal text-charcoal/75">From</span>}
          {productPriceLabel(product)}
        </p>
        <div className="mt-auto w-full pt-4">
          {externalOnly ? (
            <Link
              href={`/products/${CATALOGUE_BY_ID[product.id]?.slug ?? product.slug}`}
              className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-md bg-near-black px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-charcoal"
              aria-label={`${ctaLabel(product)}: ${name}`}
            >
              {ctaLabel(product)}
            </Link>
          ) : (
            <Button
              size="md"
              variant="primary"
              className="w-full rounded-md"
              onClick={(e) => void onCta(e)}
              loading={busy}
              disabled={!product.is_in_stock || !product.is_purchasable}
              aria-label={`${ctaLabel(product)}: ${name}`}
            >
              {ctaLabel(product)}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-cream-dark bg-cream" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-none bg-warm-white" />
      <div className="space-y-2 p-4 sm:p-5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-end justify-between pt-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}
