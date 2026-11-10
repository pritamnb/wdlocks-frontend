'use client';

import * as React from 'react';
import type { WooProduct } from '@/types';
import { Modal, CloseButton } from '@/components/ui/Modal';
import { VariationSelector } from '@/components/product/VariationSelector';
import { decodeEntities } from '@/lib/wdlocks-api';

interface Props {
  product: WooProduct | null;
  open: boolean;
  onClose: () => void;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}

/**
 * Modal size/finish picker opened from a ProductCard. Lists the 17 cylinder sizes, 12 thumb-turn
 * sizes or 2 rim finishes (from constants) and adds the chosen variation ID to the basket.
 */
export function SizePicker({ product, open, onClose, returnFocusTo }: Props) {
  const titleId = 'size-picker-title';
  return (
    <Modal open={open && !!product} onClose={onClose} labelledBy={titleId} variant="center" returnFocusTo={returnFocusTo} className="max-w-xl">
      {product && (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-cream-dark px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/75">Select options</p>
              <h2 id={titleId} className="mt-1 font-playfair text-xl font-semibold leading-snug text-near-black">
                {decodeEntities(product.name)}
              </h2>
            </div>
            <CloseButton onClick={onClose} />
          </div>
          <div className="px-5 py-5">
            <React.Suspense fallback={<div className="h-64" aria-hidden="true" />}>
              <VariationSelector product={product} headingId="size-picker" onAdded={onClose} />
            </React.Suspense>
          </div>
        </>
      )}
    </Modal>
  );
}
