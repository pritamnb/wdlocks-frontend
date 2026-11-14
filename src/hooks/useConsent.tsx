'use client';

import * as React from 'react';
import { CONSENT_STORAGE_KEY, readConsent, writeConsent, type ConsentChoice, type ConsentRecord } from '@/lib/consent';

/**
 * Cookie / storage consent for React components (the record itself lives in src/lib/consent.ts). Nothing on the site
 * sets a non-essential cookie today; the choice is stored so a future analytics or marketing script can gate itself
 * on it:
 *
 *   const { analytics } = useConsent();
 *   if (analytics) loadAnalytics();
 *
 * Both flags are false until the stored choice has been read after hydration, so a gate never fires early.
 */

interface ConsentContextValue {
  /** The stored choice, or null before hydration and while no in-date choice exists. */
  consent: ConsentRecord | null;
  analytics: boolean;
  marketing: boolean;
  /** Stores the choice and closes the popup. */
  save: (choice: ConsentChoice) => void;
  /** Whether the popup is showing: first visit, or reopened from "Cookie settings". */
  isOpen: boolean;
  /** Reopens the popup on its settings view (the footer link). */
  openSettings: () => void;
  /** Closes a reopened popup without changing the stored choice (not offered on a first visit). */
  close: () => void;
  /** True while the popup was opened from the footer rather than on first visit. */
  openedFromSettings: boolean;
}

const ConsentContext = React.createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const ctx = React.useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within <ConsentProvider>');
  return ctx;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = React.useState<ConsentRecord | null>(null);
  const [ready, setReady] = React.useState(false);
  const [openedFromSettings, setOpenedFromSettings] = React.useState(false);

  // Read once after hydration (so the server and first client render agree), then follow other tabs.
  React.useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setConsent(readConsent());
      setReady(true);
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== CONSENT_STORAGE_KEY) return;
      setConsent(readConsent());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const save = React.useCallback((choice: ConsentChoice) => {
    setConsent(writeConsent(choice));
    setOpenedFromSettings(false);
  }, []);
  const openSettings = React.useCallback(() => setOpenedFromSettings(true), []);
  const close = React.useCallback(() => setOpenedFromSettings(false), []);

  // First visit = the stored choice has been read and there is none (or it has expired).
  const needsChoice = ready && consent === null;
  const value = React.useMemo<ConsentContextValue>(
    () => ({
      consent,
      analytics: consent?.analytics ?? false,
      marketing: consent?.marketing ?? false,
      save,
      isOpen: needsChoice || openedFromSettings,
      openSettings,
      close,
      openedFromSettings,
    }),
    [consent, needsChoice, save, openSettings, close, openedFromSettings],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}
