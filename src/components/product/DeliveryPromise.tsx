'use client';

import * as React from 'react';
import { estimateDelivery, formatCountdown, formatDeliveryDate } from '@/lib/delivery';
import { SHIPPING_OPTIONS } from '@/lib/constants';
import { formatPrice } from '@/lib/wdlocks-api';
import { cn } from '@/lib/cn';

/**
 * Ultion-style "Delivers Wed 11th November" promise, computed client-side from the 2pm London cut-off.
 * Renders nothing until mounted so server and client markup match.
 */
export function DeliveryPromise({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [est, setEst] = React.useState<ReturnType<typeof estimateDelivery> | null>(null);
  React.useEffect(() => {
    const tick = () => setEst(estimateDelivery());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  if (!est) return <div className={cn('h-12', className)} aria-hidden="true" />;

  const express = SHIPPING_OPTIONS[1];
  const standard = SHIPPING_OPTIONS[0];

  return (
    <div className={cn('rounded-xl border border-cream-dark bg-warm-white px-4 py-3 text-sm', className)} role="status">
      <p className="flex items-center gap-2 font-medium text-near-black">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-red">
          <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" />
        </svg>
        {est.shipsToday ? (
          <>Order within <strong>{formatCountdown(est.minutesToCutoff)}</strong> and it ships today</>
        ) : (
          <>Ships {formatDeliveryDate(est.dispatchDate)}</>
        )}
      </p>
      {!compact && (
        <ul className="mt-2 space-y-1 text-xs text-charcoal/80">
          <li>
            <strong className="text-near-black">Arrives {formatDeliveryDate(est.expressDate)}</strong> with {express.label} ({formatPrice(express.pricePence)})
          </li>
          <li>
            Arrives {formatDeliveryDate(est.standardFrom)}–{formatDeliveryDate(est.standardTo)} with {standard.label} ({formatPrice(standard.pricePence)})
          </li>
        </ul>
      )}
      {compact && (
        <p className="mt-1 text-xs text-charcoal/80">
          Next-day from {formatDeliveryDate(est.expressDate)} · standard {formatDeliveryDate(est.standardFrom)}–{formatDeliveryDate(est.standardTo)}
        </p>
      )}
    </div>
  );
}
