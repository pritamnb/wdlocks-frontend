/**
 * Server-only Stripe client. Lazy singleton so importing this module never throws when the key is absent
 * (the routes answer 503 `not-configured` instead). The API version is pinned to the one the installed
 * `stripe` package (23.1.0) ships as its default, so the types and the wire format agree.
 */
import Stripe from 'stripe';
import { readServerEnv } from '@/lib/server-env';

/** Matches `ApiVersion` in node_modules/stripe/esm/apiVersion.js for stripe@23.1.0. */
export const STRIPE_API_VERSION = '2026-10-28.endive' satisfies Stripe.LatestApiVersion;

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(readServerEnv().stripeSecretKey);
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(readServerEnv().stripeWebhookSecret);
}

/** Throws when STRIPE_SECRET_KEY is missing — call isStripeConfigured() first in route handlers. */
export function getStripe(): Stripe {
  if (client) return client;
  const key = readServerEnv().stripeSecretKey;
  if (!key) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
  client = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    maxNetworkRetries: 2,
    timeout: 15_000,
    appInfo: { name: 'wdlocks-frontend', url: 'https://github.com/pritamnb/wdlocks-frontend' },
  });
  return client;
}

/** Returns the webhook signing secret or null; the webhook route answers 503 when null. */
export function getStripeWebhookSecret(): string | null {
  return readServerEnv().stripeWebhookSecret ?? null;
}

/** Safe, non-secret description of a Stripe error for logs and 502 bodies. */
export function describeStripeError(err: unknown): { type: string; code: string | undefined; requestId: string | undefined; message: string } {
  if (err instanceof Stripe.errors.StripeError) {
    return { type: err.type, code: err.code, requestId: err.requestId, message: err.message };
  }
  return { type: 'unknown', code: undefined, requestId: undefined, message: err instanceof Error ? err.message : String(err) };
}
