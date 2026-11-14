'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { FIELD } from '@/lib/checkout-form';
import { formatPrice } from '@/lib/wdlocks-api';
import { cn } from '@/lib/cn';
import type { CouponQuote } from '@/types';

const LABEL = 'text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70';

interface Props {
  applied: CouponQuote | null;
  checking: boolean;
  error: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  initialCode?: string;
}

/**
 * Promo code field at the top of the Payment step (Pritam, 14 Nov: "add a column for promotional code at payment").
 * The code is checked by WooCommerce (POST /api/checkout/coupon), its own message is shown when a code does not apply,
 * and the discount it quotes is taken off the order summary and the amount paid.
 */
export function PromoCode({ applied, checking, error, onApply, onRemove, initialCode = '' }: Props) {
  const [code, setCode] = React.useState(initialCode);
  React.useEffect(() => {
    if (initialCode) queueMicrotask(() => setCode(initialCode));
  }, [initialCode]);

  const submit = () => {
    const c = code.trim();
    if (c && !checking) onApply(c);
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#f7f7f7] px-3.5 py-3 text-sm" role="status">
        <p className="flex min-w-0 items-center gap-2 text-near-black">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          <span className="min-w-0">
            <span className="font-semibold uppercase tracking-wide">{applied.code}</span> applied
            {applied.discountPence > 0 && <> · you save <span className="font-semibold tabular-nums">{formatPrice(applied.discountPence)}</span></>}
            {checking && <span className="text-charcoal/60"> · checking…</span>}
          </span>
        </p>
        <button type="button" onClick={onRemove} className="shrink-0 text-sm font-medium text-charcoal/75 underline-offset-2 hover:text-red hover:underline">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="co-promo" className={LABEL}>
        Promo code <span className="font-normal normal-case tracking-normal text-charcoal/50">(optional)</span>
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="co-promo"
          name="promo"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'co-promo-error' : undefined}
          className={cn(FIELD, 'min-w-0 flex-1 uppercase placeholder:normal-case')}
          placeholder="Enter your code"
        />
        <Button variant="dark" className="h-auto shrink-0 rounded-xl px-5" onClick={submit} loading={checking} disabled={!code.trim()}>
          Apply
        </Button>
      </div>
      {error && <p id="co-promo-error" role="alert" className="mt-1 text-xs font-medium text-red">{error}</p>}
    </div>
  );
}
