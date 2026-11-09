'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** Visible product name used to label the controls for screen readers. */
  itemName: string;
  size?: 'sm' | 'md';
}

export function QuantityControl({ value, min = 1, max = 99, onChange, disabled, itemName, size = 'md' }: Props) {
  const [draft, setDraft] = React.useState(String(value));
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    // External value changed (optimistic update / rollback): resync the draft during render.
    setPrevValue(value);
    setDraft(String(value));
  }

  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const btn = cn(
    'inline-flex items-center justify-center rounded-full text-near-black transition-colors duration-150 hover:bg-cream-mid disabled:opacity-40 disabled:hover:bg-transparent',
    size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
  );

  return (
    <div
      className={cn('inline-flex items-center rounded-full border border-cream-dark bg-warm-white', size === 'sm' ? 'h-9' : 'h-11')}
      role="group"
      aria-label={`Quantity for ${itemName}`}
    >
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min} aria-label={`Decrease quantity of ${itemName}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
        disabled={disabled}
        aria-label={`Quantity of ${itemName}`}
        className={cn('w-9 bg-transparent text-center text-sm font-semibold tabular-nums text-near-black outline-none', size === 'sm' && 'w-8')}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max} aria-label={`Increase quantity of ${itemName}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}
