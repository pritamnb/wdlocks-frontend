'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/ui/ErrorBoundary';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app/error]', error);
  }, [error]);
  return (
    <div className="container-wd py-24">
      <ErrorFallback reset={reset} message="We couldn’t load this page. Our store at wdlocks.co.uk may be briefly unavailable — please try again." />
    </div>
  );
}
