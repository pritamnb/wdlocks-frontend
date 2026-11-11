'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { WooProduct } from '@/types';
import { Spinner } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/useCart';
import { productPriceLabel, decodeEntities } from '@/lib/wdlocks-api';
import { primaryImage, ctaLabel, isExternalOnly } from '@/lib/product-helpers';
import { BRAND_VIDEO, CARD_HOVER_CLIPS, CATALOGUE_BY_ID } from '@/lib/constants';
import { HoverPreview } from '@/components/media/HoverPreview';
import { previewFromProduct } from '@/lib/cart-optimistic';
import { cn } from '@/lib/cn';

interface Props {
  product: WooProduct;
  /** Called when a variable product's CTA is pressed; the grid owns the SizePicker. */
  onChooseOptions?: (product: WooProduct, trigger: HTMLButtonElement) => void;
  priority?: boolean;
}

export function ProductCard({ product, onChooseOptions, priority = false }: Props) {
  const { addToCart, warmSession } = useCart();
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
    // The drawer opens instantly with a provisional line (see useCart); the server cart replaces it.
    await addToCart({ id: product.id, quantity: 1, name, preview: previewFromProduct(product, 1, entry?.shortName ?? name) });
    setBusy(false);
  };

  const cta = cn(
    'mx-auto flex h-12 w-full max-w-[220px] items-center justify-center whitespace-nowrap rounded-lg px-6 text-base font-semibold text-white',
    'bg-red transition-colors duration-300 hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-60',
  );

  // Five shared rows (image, title, blurb, price, CTA) adopted from the grid via subgrid so every row lines up across the
  // whole grid row; each zone also reserves its own height, so browsers without subgrid still align.
  return (
    <article
      className={cn(
        'group relative grid h-full grid-rows-subgrid row-span-5 gap-y-0 overflow-hidden rounded-[20px] bg-[#f0f0f0]',
        'transition-transform duration-300 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden" aria-label={name} tabIndex={-1}>
        {image ? (
          hoverClip ? (
            // Safari cannot blend <video>, so the card plays a variant of the clip whose white background is pre-tinted to the
            // tile grey (#f0f0f0, see public/brand/video/*-grey.mp4) and no blend mode is needed.
            <HoverPreview src={BRAND_VIDEO.clips[hoverClip].mp4.replace(/\.mp4$/, '-grey.mp4')} blend="plain" className="absolute inset-0 bg-[#f0f0f0]">
              <Image src={image.src} alt={image.alt || name} fill priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" className="object-contain p-5 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none" />
            </HoverPreview>
          ) : (
            <Image src={image.src} alt={image.alt || name} fill priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" className="object-contain p-5 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none" />
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

      {/* Title: always two lines tall, clamped and balanced. */}
      <h3 className="line-clamp-2 min-h-[calc(2lh+1.5rem)] px-5 pt-6 text-center text-[26px] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-near-black sm:text-[28px]">
        <Link href={href} className="transition-colors duration-150 hover:text-red focus-visible:text-red">
          {entry?.shortName ?? name}
        </Link>
      </h3>
      {/* Blurb: two lines reserved even when short or empty. */}
      <p className="mx-auto line-clamp-2 min-h-[calc(2lh+0.5rem)] max-w-[30ch] px-5 pt-2 text-center text-[15px] leading-6 text-pretty text-[#353535]/80">{entry?.blurb}</p>
      {/* Price: one fixed line. */}
      <p className="h-[calc(1.5rem+0.75rem)] px-5 pt-3 text-center text-base font-semibold leading-6 tabular-nums text-near-black">
        {isVariable && product.prices.price_range && <span className="mr-1 font-sans text-xs font-normal text-charcoal/75">From</span>}
        {productPriceLabel(product)}
      </p>
      <div className="px-5 pb-6 pt-5">
        {externalOnly ? (
          <Link href={`/products/${CATALOGUE_BY_ID[product.id]?.slug ?? product.slug}`} className={cta} aria-label={`${ctaLabel(product)}: ${name}`}>
            {ctaLabel(product)}
          </Link>
        ) : (
          <button
            type="button"
            className={cta}
            onClick={(e) => void onCta(e)}
            onPointerEnter={warmSession}
            onFocus={warmSession}
            disabled={!product.is_in_stock || !product.is_purchasable || busy}
            aria-busy={busy || undefined}
            aria-label={`${ctaLabel(product)}: ${name}`}
          >
            {busy && <Spinner className="mr-2" />}
            {ctaLabel(product)}
          </button>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="grid h-full grid-rows-subgrid row-span-5 gap-y-0 overflow-hidden rounded-[20px] bg-[#f0f0f0]" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-none bg-[#e6e6e6]" />
      <Skeleton className="mx-auto mt-6 h-7 w-3/4" />
      <Skeleton className="mx-auto mt-2 h-4 w-1/2" />
      <Skeleton className="mx-auto mt-3 h-5 w-16" />
      <div className="px-5 pb-6 pt-5"><Skeleton className="mx-auto h-12 w-full max-w-[220px] rounded-lg" /></div>
    </div>
  );
}
