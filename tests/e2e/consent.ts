import type { Page } from '@playwright/test';

/** Stored shape of the cookie choice (src/hooks/useConsent.tsx). */
export const CONSENT_KEY = 'wd:consent';

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
    [CONSENT_KEY, JSON.stringify({ v: 1, essential: true, analytics: false, marketing: false, at: new Date().toISOString() })],
  );
}
