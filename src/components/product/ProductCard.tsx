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

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[10px] bg-[#f0f0f0]',
        'transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgb(0_0_0/0.35)]',
      )}
    >
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-[#f0f0f0] sm:aspect-square" aria-label={name} tabIndex={-1}>
        {image ? (
          hoverClip ? (
            <HoverPreview src={BRAND_VIDEO.clips[hoverClip].mp4} className="absolute inset-0">
              <Image src={image.src} alt={image.alt || name} fill priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain p-8 transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
            </HoverPreview>
          ) : (
            <Image src={image.src} alt={image.alt || name} fill priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain p-8 transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
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

      <div className="flex flex-1 flex-col items-center px-6 pb-7 pt-2 text-center">
        <h3 className="text-[22px] font-medium leading-snug text-near-black sm:text-2xl">
          <Link href={href} className="transition-colors duration-150 hover:text-red focus-visible:text-red">
            {entry?.shortName ?? name}
          </Link>
        </h3>
        {entry?.blurb && <p className="mt-2 max-w-[28ch] text-[15px] leading-relaxed text-[#353535]/80">{entry.blurb}</p>}
        <p className="mt-3 text-base font-semibold tabular-nums text-near-black">
          {isVariable && product.prices.price_range && <span className="mr-1 font-sans text-xs font-normal text-charcoal/75">From</span>}
          {productPriceLabel(product)}
        </p>
        <div className="mt-auto w-full pt-5">
          {externalOnly ? (
            <Link
              href={`/products/${CATALOGUE_BY_ID[product.id]?.slug ?? product.slug}`}
              className="mx-auto inline-flex h-12 w-full max-w-[220px] items-center justify-center rounded-lg bg-red px-6 text-base font-semibold text-white transition-colors duration-300 hover:bg-red-deep"
              aria-label={`${ctaLabel(product)}: ${name}`}
            >
              {ctaLabel(product)}
            </Link>
          ) : (
            <Button
              size="md"
              variant="primary"
              className="mx-auto h-12 w-full max-w-[220px] rounded-lg text-base"
              onClick={(e) => void onCta(e)}
              onPointerEnter={warmSession}
              onFocus={warmSession}
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
    <div className="flex flex-col overflow-hidden rounded-[10px] bg-[#f0f0f0]" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-none bg-[#e6e6e6]" />
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
