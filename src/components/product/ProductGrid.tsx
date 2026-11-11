'use client';

import * as React from 'react';
import type { WooProduct } from '@/types';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { SizePicker } from '@/components/product/SizePicker';
import { SITE } from '@/lib/constants';

interface Props {
  products: WooProduct[];
  loading?: boolean;
  /** Max cards to show (homepage shows 8). */
  limit?: number;
  skeletonCount?: number;
}

export function ProductGrid({ products, loading = false, limit, skeletonCount = 8 }: Props) {
  const [picking, setPicking] = React.useState<WooProduct | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const visible = limit ? products.slice(0, limit) : products;

  if (!loading && products.length === 0) {
    return (
      <div role="status" className="rounded-2xl border border-dashed border-cream-dark bg-warm-white p-10 text-center">
        <p className="font-playfair text-lg font-semibold text-near-black">Products are temporarily unavailable</p>
        <p className="mt-1 text-sm text-charcoal/70">
          Please refresh in a moment, or call us on{' '}
          <a href={SITE.phoneHref} className="font-medium text-red underline-offset-2 hover:underline">{SITE.phone}</a> to order.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy={loading}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <li key={i}><ProductCardSkeleton /></li>
            ))
          : visible.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  priority={i < 4}
                  onChooseOptions={(product, trigger) => {
                    triggerRef.current = trigger;
                    setPicking(product);
                  }}
                />
              </li>
            ))}
      </ul>
      <SizePicker product={picking} open={picking !== null} onClose={() => setPicking(null)} returnFocusTo={triggerRef} />
    </>
  );
}
