/**
 * Cookie / storage consent record, held in localStorage (`wd:consent`) like the basket (src/lib/basket.ts).
 * Pure read/write helpers; the React side is src/hooks/useConsent.tsx. Code that runs outside <ConsentProvider>
 * (a script tag in the root layout, say) reads the stored choice with `readConsent()` instead of the hook.
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

/** Stores the choice with the current time and returns the record written. */
export function writeConsent(choice: ConsentChoice): ConsentRecord {
  const record: ConsentRecord = { v: CONSENT_VERSION, essential: true, analytics: choice.analytics, marketing: choice.marketing, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode / storage blocked: the choice lives for this page view only.
  }
  return record;
}
