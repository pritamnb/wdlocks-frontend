'use client';

import Link from 'next/link';
import type { WooCart } from '@/types';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { formatPrice, sumPence } from '@/lib/wdlocks-api';
import { cn } from '@/lib/cn';

interface Props {
  cart: WooCart;
  pendingKeys: ReadonlySet<string>;
  onQuantity: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  /** Delivery line when no rate is selected yet. */
  deliveryFallback?: string;
}

/**
 * Right-hand order summary: lines, subtotal, delivery, VAT, total, all computed from the local basket (src/lib/basket.ts).
 * Coupons are not offered: the basket never talks to WooCommerce before "Place order", so a code could only be checked
 * after the order exists; the shop runs no public coupons today.
 */
export function OrderSummary({ cart, pendingKeys, onQuantity, onRemove, deliveryFallback = 'Chosen below' }: Props) {
  const t = cart.totals;
  const subtotal = sumPence(t.total_items, t.total_items_tax);
  const discount = sumPence(t.total_discount, t.total_discount_tax);
  const shipping = t.total_shipping === null ? null : sumPence(t.total_shipping, t.total_shipping_tax);
  const selectedRate = cart.shipping_rates[0]?.shipping_rates.find((r) => r.selected) ?? null;
  const total = Number.parseInt(t.total_price, 10) || 0;
  const vat = Number.parseInt(t.total_tax, 10) || 0;
  const count = cart.items_count;

  return (
    <div className="rounded-2xl border border-black/10 bg-[#f7f7f7] p-5 sm:p-6">
      <h2 className="font-playfair text-xl font-semibold text-near-black">Order summary</h2>
      <ul className="mt-2 divide-y divide-black/10">
        {cart.items.map((item) => (
          <CartLineItem key={item.key} item={item} pending={pendingKeys.has(item.key)} onQuantity={onQuantity} onRemove={onRemove} onNavigate={() => undefined} />
        ))}
      </ul>

      <dl className="mt-4 space-y-2.5 border-t border-black/10 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-charcoal/80">Subtotal <span className="text-xs">({count} {count === 1 ? 'item' : 'items'})</span></dt>
          <dd className="font-semibold tabular-nums text-near-black">{formatPrice(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-charcoal/80">Discount</dt>
            <dd className="font-semibold tabular-nums text-red">−{formatPrice(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-charcoal/80">Delivery{selectedRate && <span className="block text-xs text-charcoal/60">{selectedRate.name}</span>}</dt>
          <dd className={cn('tabular-nums', shipping === null ? 'text-charcoal/70' : 'font-semibold text-near-black')}>{shipping === null ? deliveryFallback : shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-black/10 pt-3">
          <dt className="font-semibold text-near-black">Total</dt>
          <dd className="text-right">
            <span className="font-playfair text-2xl font-semibold tabular-nums text-near-black">{formatPrice(total)}</span>
            <span className="block text-xs text-charcoal/65">includes {formatPrice(vat)} VAT</span>
          </dd>
        </div>
      </dl>
      <Link href="/basket" className="mt-4 block text-center text-sm font-medium text-charcoal/75 hover:text-red">Edit basket</Link>
    </div>
  );
}
