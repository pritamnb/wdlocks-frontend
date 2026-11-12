'use client';

import * as React from 'react';
import type { WooShippingPackage, WooShippingRate } from '@/types';
import { formatPrice, sumPence } from '@/lib/wdlocks-api';
import { estimateDelivery, formatDeliveryDate } from '@/lib/delivery';
import { cn } from '@/lib/cn';

interface Props {
  packages: WooShippingPackage[];
  pending: boolean;
  onSelect: (packageId: number, rateId: string) => void;
  /** Client-only clock (null during SSR). */
  now: Date | null;
}

function arrivalFor(rate: WooShippingRate, now: Date | null): string | null {
  if (!now) return null;
  const est = estimateDelivery(now);
  const id = rate.method_id + ':' + rate.instance_id;
  if (/saturday/i.test(rate.name)) return 'Delivered on Saturday';
  if (/24|special|next/i.test(rate.name) || id === 'flat_rate:2') return `Arrives ${formatDeliveryDate(est.expressDate)}`;
  return `Arrives ${formatDeliveryDate(est.standardFrom)} – ${formatDeliveryDate(est.standardTo)}`;
}

/** Radio list of the delivery options (SHIPPING_OPTIONS, shaped as one Store API shipping package by the basket). */
export function ShippingOptions({ packages, pending, onSelect, now }: Props) {
  const pkg = packages[0];
  const serverSelected = pkg?.shipping_rates.find((r) => r.selected)?.rate_id ?? null;
  // The radio moves immediately; the basket's choice replaces it on the next render.
  const [optimistic, setOptimistic] = React.useState<string | null>(null);
  const lastServer = React.useRef(serverSelected);
  if (lastServer.current !== serverSelected) {
    lastServer.current = serverSelected;
    if (optimistic !== null) setOptimistic(null);
  }
  const selectedId = optimistic ?? serverSelected;
  if (!pkg || pkg.shipping_rates.length === 0) {
    return <p className="text-sm text-charcoal/75">Add something to your basket to see delivery options.</p>;
  }
  return (
    <div role="radiogroup" aria-label="Delivery method" aria-busy={pending} className={cn('space-y-2', pending && 'opacity-60')}>
      {pkg.shipping_rates.map((rate) => {
        const price = sumPence(rate.price, rate.taxes);
        const arrival = arrivalFor(rate, now);
        return (
          <label
            key={rate.rate_id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors duration-150',
              rate.rate_id === selectedId ? 'border-near-black bg-white ring-1 ring-near-black' : 'border-black/10 bg-white hover:border-black/30',
            )}
          >
            <input
              type="radio"
              name="shipping_rate"
              value={rate.rate_id}
              checked={rate.rate_id === selectedId}
              disabled={pending}
              onChange={() => {
                setOptimistic(rate.rate_id);
                onSelect(pkg.package_id, rate.rate_id);
              }}
              className="mt-1 h-4 w-4 accent-red"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-near-black">{rate.name}</span>
              {(arrival || rate.delivery_time) && <span className="mt-0.5 block text-xs text-charcoal/70">{arrival ?? rate.delivery_time}</span>}
            </span>
            <span className="text-sm font-semibold tabular-nums text-near-black">{price === 0 ? 'Free' : formatPrice(price)}</span>
          </label>
        );
      })}
    </div>
  );
}
