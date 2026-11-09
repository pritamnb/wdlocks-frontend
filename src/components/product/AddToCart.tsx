'use client';

import * as React from 'react';
import type { WooProduct } from '@/types';
import { Button } from '@/components/ui/Button';
import { QuantityControl } from '@/components/cart/QuantityControl';
import { VariationSelector } from '@/components/product/VariationSelector';
import { useCart } from '@/hooks/useCart';
import { decodeEntities, formatPrice } from '@/lib/wdlocks-api';

/** Product-page purchase box: inline size/finish picker for variable products, qty + add for simple ones. */
export function AddToCart({ product }: { product: WooProduct }) {
  const { addToCart, isAdding } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const name = decodeEntities(product.name);

  if (product.type === 'variable') {
    return (
      <section id="sizing" className="scroll-mt-28 rounded-2xl border border-cream-dark bg-warm-white p-5" aria-labelledby="pdp-options-label">
        <VariationSelector product={product} headingId="pdp-options" />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <QuantityControl value={quantity} onChange={setQuantity} itemName={name} min={1} max={product.sold_individually ? 1 : 99} disabled={isAdding} />
      <Button
        size="lg"
        className="flex-1"
        loading={isAdding}
        disabled={!product.is_in_stock || !product.is_purchasable}
        onClick={() => void addToCart({ id: product.id, quantity, name })}
      >
        {product.is_in_stock ? (
          <>
            Add to basket <span aria-hidden="true" className="opacity-70">·</span> {formatPrice(Number.parseInt(product.prices.price, 10) * quantity)}
          </>
        ) : (
          'Out of stock'
        )}
      </Button>
    </div>
  );
}
