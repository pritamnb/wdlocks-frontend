'use client';

import * as React from 'react';

/**
 * Cookie / storage consent, held in localStorage (`wd:consent`) like the basket. Nothing on the site sets a
 * non-essential cookie today; the choice is stored so a future analytics or marketing script can gate itself on it:
 *
 *   const { analytics } = useConsent();
 *   if (analytics) loadAnalytics();
 *
 * Essential storage (basket, checkout form, demo-order / checkout cookies, Stripe's fraud frame on the checkout) is
 * always on and not asked about. The choice is asked again after 12 months (UK ICO guidance).
 */

export const CONSENT_STORAGE_KEY = 'wd:consent';
const CONSENT_VERSION = 1;
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export interface ConsentRecord {
  v: typeof CONSENT_VERSION;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  /** ISO date of the choice. */
  at: string;
}

export type ConsentChoice = Pick<ConsentRecord, 'analytics' | 'marketing'>;

export const ESSENTIAL_ONLY: ConsentChoice = { analytics: false, marketing: false };
export const ACCEPT_ALL: ConsentChoice = { analytics: true, marketing: true };

/** Reads a stored, in-date choice; null when none has been made, it has expired or it cannot be parsed. */
export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord> | null;
    if (!parsed || parsed.v !== CONSENT_VERSION || typeof parsed.at !== 'string') return null;
    const at = Date.parse(parsed.at);
    if (!Number.isFinite(at) || Date.now() - at > CONSENT_MAX_AGE_MS) return null;
    return { v: CONSENT_VERSION, essential: true, analytics: parsed.analytics === true, marketing: parsed.marketing === true, at: parsed.at };
  } catch {
    return null;
  }
}

function writeConsent(choice: ConsentChoice): ConsentRecord {
  const record: ConsentRecord = { v: CONSENT_VERSION, essential: true, analytics: choice.analytics, marketing: choice.marketing, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode / storage blocked: the choice lives for this page view only.
  }
  return record;
}

interface ConsentContextValue {
  /** The stored choice, or null before hydration and while no in-date choice exists. */
  consent: ConsentRecord | null;
  /** False until localStorage has been read (after hydration). */
  ready: boolean;
  /** True when the visitor still has to choose: ready and no in-date choice. */
  needsChoice: boolean;
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

  const needsChoice = ready && consent === null;
  const value = React.useMemo<ConsentContextValue>(
    () => ({
      consent,
      ready,
      needsChoice,
      analytics: consent?.analytics ?? false,
      marketing: consent?.marketing ?? false,
      save,
      isOpen: needsChoice || openedFromSettings,
      openSettings,
      close,
      openedFromSettings,
    }),
    [consent, ready, needsChoice, save, openSettings, close, openedFromSettings],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}
