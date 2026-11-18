'use client';

import * as React from 'react';
import { useConsent } from '@/hooks/useConsent';
import { applyGoogleConsent } from '@/lib/google-tags';
import { GOOGLE_TAGS_ENABLED } from '@/lib/site-flags';

/** Loads the Google tags once the visitor's cookie choice allows them (see src/lib/google-tags.ts). Renders nothing. */
export function GoogleTags() {
  const { consent, analytics, marketing } = useConsent();
  React.useEffect(() => {
    // No stored choice yet (first visit, or before hydration): nothing loads.
    if (!GOOGLE_TAGS_ENABLED || !consent) return;
    applyGoogleConsent({ analytics, marketing });
  }, [consent, analytics, marketing]);
  return null;
}
