'use client';

import * as React from 'react';
import type { WooProduct } from '@/types';
import { Button } from '@/components/ui/Button';
import { QuantityControl } from '@/components/cart/QuantityControl';
import { VariationSelector } from '@/components/product/VariationSelector';
import { useCart } from '@/hooks/useCart';
import { decodeEntities, formatPrice } from '@/lib/wdlocks-api';
import { isExternalOnly } from '@/lib/product-helpers';
import { DeliveryPromise } from '@/components/product/DeliveryPromise';
import { previewFromProduct } from '@/lib/basket';

/** Product-page purchase box: inline size/finish picker for variable products, qty + add for simple ones. */
/** `variationPrices`: inc-VAT pence per variation id from WooCommerce (sizes may be priced differently). */
export function AddToCart({ product, variationPrices }: { product: WooProduct; variationPrices?: Record<number, number> }) {
  const { addToCart, isAdding } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const name = decodeEntities(product.name);

  if (isExternalOnly(product)) {
    return (
      <div className="rounded-2xl border border-cream-dark bg-warm-white p-5">
        <p className="text-sm font-semibold text-near-black">This item is cut to your existing key</p>
        <p className="mt-1 text-sm text-charcoal/80">
          We need the key number stamped on your Watchdog key, so this product is ordered on wdlocks.co.uk where you can
          enter it securely.
        </p>
        <a
          href={product.permalink}
          rel="noopener"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-dark"
        >
          Order on wdlocks.co.uk <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  if (product.type === 'variable') {
    return (
      <section id="sizing" className="scroll-mt-28 rounded-2xl border border-cream-dark bg-warm-white p-5" aria-labelledby="pdp-options-label">
        <React.Suspense fallback={<div className="h-64" aria-hidden="true" />}>
          <VariationSelector product={product} variationPrices={variationPrices} headingId="pdp-options" showUpsells />
        </React.Suspense>
      </section>
    );
  }

  return (
    <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <QuantityControl value={quantity} onChange={setQuantity} itemName={name} min={1} max={product.sold_individually ? 1 : 99} disabled={isAdding} />
      <Button
        size="lg"
        className="flex-1"
        loading={isAdding}
        disabled={!product.is_in_stock || !product.is_purchasable}
        onClick={() => void addToCart({ id: product.id, quantity, name, preview: previewFromProduct(product, quantity, name) })}
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
    <DeliveryPromise />
    </div>
  );
}
