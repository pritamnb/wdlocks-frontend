'use client';

import { useConsent } from '@/hooks/useConsent';

/** Footer link that reopens the cookie consent popup on its settings view. Styled like the other footer links. */
export function CookieSettingsLink({ className }: { className?: string }) {
  const { openSettings } = useConsent();
  return (
    <button type="button" onClick={openSettings} className={className}>
      Cookie settings
    </button>
  );
}
