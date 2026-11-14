import type { Page } from '@playwright/test';

/** Stored shape of the cookie choice (src/lib/consent.ts). */
export const CONSENT_KEY = 'wd:consent';

export interface ConsentRecord {
  v: 1;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  at: string;
}

/** A stored "Essential only" choice made now; override fields to build other states (an expired choice, say). */
export function consentRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return { v: 1, essential: true, analytics: false, marketing: false, at: new Date().toISOString(), ...overrides };
}

/**
 * Pre-answers the cookie consent popup ("Essential only") before any page script runs, so specs that are not about
 * the popup never have it covering the bottom of the viewport. Specs that test the popup remove the key again.
 */
export async function presetConsent(page: Page) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value);
      } catch {
        // Storage blocked: the popup will show and the spec has to cope.
      }
    },
    [CONSENT_KEY, JSON.stringify(consentRecord())],
  );
}
