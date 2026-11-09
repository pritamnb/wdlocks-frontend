'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Called when an error is caught (hook up logging here). */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== 'production') console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <ErrorFallback reset={this.reset} />;
  }
}

export function ErrorFallback({
  reset,
  title = 'Something went wrong',
  message = 'We couldn’t load this part of the page. Please try again.',
}: {
  reset: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <div
      role="alert"
      className="mx-auto my-8 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-cream-dark bg-warm-white p-6 text-center"
    >
      <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10 text-lg text-red">!</span>
      <h2 className="font-playfair text-xl font-semibold text-near-black">{title}</h2>
      <p className="text-sm text-charcoal/80">{message}</p>
      <Button variant="secondary" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
