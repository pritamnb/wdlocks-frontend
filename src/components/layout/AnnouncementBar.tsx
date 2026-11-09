'use client';

import * as React from 'react';
import { ANNOUNCEMENT } from '@/lib/constants';

const STORAGE_KEY = 'wd:announcement-dismissed:v1';
const EVENT = 'wd:announcement-change';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // storage unavailable (private mode) — keep bar visible
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

export function AnnouncementBar() {
  // Server snapshot = not dismissed, so SSR/hydration match; the client value takes over right after.
  const dismissed = React.useSyncExternalStore(subscribe, readDismissed, () => false);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  if (dismissed) return null;

  const parts = ANNOUNCEMENT.split(' · ');

  return (
    <div className="relative bg-red text-white" role="region" aria-label="Store announcements">
      <div className="container-wd flex min-h-9 items-center justify-center py-1.5 pr-10 text-center text-[13px] font-medium leading-snug sm:text-sm">
        <p className="m-0">
          {parts.map((part, i) => (
            <span key={part} className={i > 0 ? 'hidden sm:inline' : undefined}>
              {i > 0 && <span aria-hidden="true" className="mx-2 opacity-70">·</span>}
              {part}
            </span>
          ))}
        </p>
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
