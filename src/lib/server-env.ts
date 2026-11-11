/**
 * Server-only environment access for the checkout (Stripe + WooCommerce REST).
 * Every secret is read HERE and nowhere else, so a grep for process.env tells the whole story.
 * Values are read lazily (not at module load) so Vercel runtime env changes are picked up and
 * nothing is evaluated during `next build`. Never log the returned values.
 */

export interface ServerEnv {
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  wcConsumerKey: string | undefined;
  wcConsumerSecret: string | undefined;
}

function nonEmpty(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function readServerEnv(): ServerEnv {
  return {
    stripeSecretKey: nonEmpty(process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: nonEmpty(process.env.STRIPE_WEBHOOK_SECRET),
    wcConsumerKey: nonEmpty(process.env.WC_CONSUMER_KEY),
    wcConsumerSecret: nonEmpty(process.env.WC_CONSUMER_SECRET),
  };
}
