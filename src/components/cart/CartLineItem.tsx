'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { WooCartItem } from '@/types';
import { QuantityControl } from '@/components/cart/QuantityControl';
import { formatPrice, sumPence, decodeEntities } from '@/lib/wdlocks-api';
import { productHref } from '@/lib/product-helpers';
import { MAX_CART_QUANTITY } from '@/lib/constants';

interface Props {
  item: WooCartItem;
  pending: boolean;
  onQuantity: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onNavigate: () => void;
}

export function CartLineItem({ item, pending, onQuantity, onRemove, onNavigate }: Props) {
  const image = item.images[0];
  const href = productHref(item.id);
  const name = decodeEntities(item.name);
  const lineIncVat = sumPence(item.totals.line_subtotal, item.totals.line_subtotal_tax);
  const max = Math.min(item.quantity_limits.maximum || MAX_CART_QUANTITY, MAX_CART_QUANTITY);

  return (
    // The basket is local (src/lib/basket.ts): nothing is ever "saving", so the controls are always live.
    <li className="flex gap-4 py-4" aria-busy={pending}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
        {image ? (
          <Image src={image.thumbnail || image.src} alt={image.alt || name} fill sizes="80px" className="object-contain p-1.5" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {href ? (
              <Link href={href} onClick={onNavigate} className="line-clamp-2 text-sm font-medium text-near-black hover:text-red transition-colors duration-150">
                {name}
              </Link>
            ) : (
              <p className="line-clamp-2 text-sm font-medium text-near-black">{name}</p>
            )}
            {item.variation.length > 0 && (
              <p className="mt-0.5 text-xs text-charcoal/70">
                {item.variation.map((v) => `${v.attribute}: ${v.value}`).join(' · ')}
              </p>
            )}
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-near-black">{formatPrice(lineIncVat)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <QuantityControl
            size="sm"
            value={item.quantity}
            min={1}
            max={item.sold_individually ? 1 : max}
            disabled={!item.quantity_limits.editable}
            itemName={name}
            onChange={(q) => onQuantity(item.key, q)}
          />
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            className="text-xs font-medium text-charcoal/75 underline-offset-2 transition-colors duration-150 hover:text-red hover:underline disabled:opacity-50"
            aria-label={`Remove ${name} from basket`}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
