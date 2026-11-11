'use client';

import * as React from 'react';
import Link from 'next/link';
import type { WooCart } from '@/types';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { Spinner } from '@/components/ui/Button';
import { formatPrice, sumPence } from '@/lib/wdlocks-api';
import { FIELD } from '@/lib/checkout-form';
import { cn } from '@/lib/cn';

interface Props {
  cart: WooCart;
  pendingKeys: ReadonlySet<string>;
  onQuantity: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onApplyCoupon: (code: string) => Promise<boolean>;
  onRemoveCoupon: (code: string) => Promise<boolean>;
  couponPending: boolean;
  /** Delivery line when no rate is selected yet. */
  deliveryFallback?: string;
}

/** Right-hand order summary: lines, coupon, subtotal, delivery, VAT, total. Totals come straight from the Store API. */
export function OrderSummary({ cart, pendingKeys, onQuantity, onRemove, onApplyCoupon, onRemoveCoupon, couponPending, deliveryFallback = 'Chosen below' }: Props) {
  const [code, setCode] = React.useState('');
  const [showCoupon, setShowCoupon] = React.useState(cart.coupons.length > 0);
  const t = cart.totals;
  const subtotal = sumPence(t.total_items, t.total_items_tax);
  const discount = sumPence(t.total_discount, t.total_discount_tax);
  const shipping = t.total_shipping === null ? null : sumPence(t.total_shipping, t.total_shipping_tax);
  const selectedRate = cart.shipping_rates[0]?.shipping_rates.find((r) => r.selected) ?? null;
  const total = Number.parseInt(t.total_price, 10) || 0;
  const vat = Number.parseInt(t.total_tax, 10) || 0;
  const count = cart.items_count;

  const submitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    const ok = await onApplyCoupon(c);
    if (ok) setCode('');
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-[#f7f7f7] p-5 sm:p-6">
      <h2 className="font-playfair text-xl font-semibold text-near-black">Order summary</h2>
      <ul className="mt-2 divide-y divide-black/10">
        {cart.items.map((item) => (
          <CartLineItem key={item.key} item={item} pending={pendingKeys.has(item.key)} onQuantity={onQuantity} onRemove={onRemove} onNavigate={() => undefined} />
        ))}
      </ul>

      <div className="mt-3 border-t border-black/10 pt-3">
        {!showCoupon ? (
          <button type="button" onClick={() => setShowCoupon(true)} className="text-sm font-medium text-near-black underline-offset-2 hover:text-red hover:underline">
            Got a coupon?
          </button>
        ) : (
          <form onSubmit={(e) => void submitCoupon(e)} className="flex gap-2">
            <label htmlFor="coupon" className="sr-only">Coupon code</label>
            <input id="coupon" name="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" autoComplete="off" className={cn(FIELD, 'h-11 py-0')} />
            <button type="submit" disabled={couponPending || !code.trim()} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-near-black px-4 text-sm font-semibold text-white transition-colors hover:bg-charcoal disabled:opacity-50">
              {couponPending && <Spinner />}
              Apply
            </button>
          </form>
        )}
        {cart.coupons.length > 0 && (
          <ul className="mt-2 space-y-1">
            {cart.coupons.map((c) => (
              <li key={c.code} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/10">
                <span className="font-medium text-near-black">Coupon <span className="uppercase">{c.code}</span></span>
                <button type="button" onClick={() => void onRemoveCoupon(c.code)} disabled={couponPending} className="text-xs font-medium text-charcoal/70 underline-offset-2 hover:text-red hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
