'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/constants';
import { estimateDelivery, formatCountdown } from '@/lib/delivery';

const STORAGE_KEY = 'wd:announcement-dismissed:v2';
const EVENT = 'wd:announcement-change';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

/**
 * Contextual utility strip (Ultion pattern): product pages get the dispatch/delivery promise,
 * everything else nudges existing owners towards extra keys and the guarantee.
 */
export function AnnouncementBar() {
  const pathname = usePathname();
  const dismissed = React.useSyncExternalStore(subscribe, readDismissed, () => false);
  // Countdown is client-only; render the static version on the server to avoid hydration mismatch.
  const [est, setEst] = React.useState<ReturnType<typeof estimateDelivery> | null>(null);
  React.useEffect(() => {
    const tick = () => setEst(estimateDelivery());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (dismissed) return null;
  const onProduct = pathname.startsWith('/products/');

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <div className={onProduct ? 'relative bg-near-black text-white' : 'relative bg-red text-white'} role="region" aria-label="Store announcements">
      <div className="container-wd flex min-h-9 items-center justify-center py-1.5 pr-10 text-center text-[13px] font-medium leading-snug sm:text-sm">
        {onProduct ? (
          <p className="m-0">
            <span className="font-semibold uppercase tracking-[0.12em] text-cream-dark">Order today, dispatched {est?.shipsToday ? 'today' : 'next working day'}</span>
            {est?.shipsToday && est.minutesToCutoff > 0 && (
              <span className="hidden sm:inline"> · order within <strong>{formatCountdown(est.minutesToCutoff)}</strong> for same-day dispatch</span>
            )}
          </p>
        ) : (
          <p className="m-0">
            Already own a Watchdog lock?{' '}
            <Link href="/products/watchdog-3-star-alps-extra-keys" className="underline decoration-white/60 underline-offset-2 hover:decoration-white">Order extra keys</Link>
            <span className="hidden sm:inline">
              {' '}<span aria-hidden="true" className="mx-2 opacity-70">·</span>Same-day dispatch before {SITE.dispatchCutoff}
              <span aria-hidden="true" className="mx-2 opacity-70">·</span>BSI Kitemarked 3 Star
            </span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/90 transition-colors duration-150 hover:bg-white/15 hover:text-white sm:right-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
