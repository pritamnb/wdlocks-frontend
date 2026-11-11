import { createHash } from 'node:crypto';
import type { WooCart } from '@/types';

/**
 * Stable fingerprint of what the shopper is about to pay for: item ids + quantities, coupon codes,
 * the selected shipping rate(s) and the grand total (minor units). Addresses are deliberately NOT part
 * of it — a changed address with the same basket reuses the same pending order (we just update it).
 *
 * The client may send its own `cart_hash`, but the server always recomputes this from the live cart and
 * uses its own value for order reuse and Stripe metadata.
 */
export function cartHash(cart: WooCart): string {
  const items = cart.items
    .map((item) => [item.id, item.quantity] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const coupons = cart.coupons.map((c) => c.code.toLowerCase()).sort();
  const rates = selectedRateIds(cart).sort();
  const payload = JSON.stringify({ items, coupons, rates, total: cart.totals.total_price });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/** rate_id of the selected rate in every shipping package, in package order. */
export function selectedRateIds(cart: WooCart): string[] {
  const out: string[] = [];
  for (const pkg of cart.shipping_rates) {
    const selected = pkg.shipping_rates.find((r) => r.selected);
    if (selected) out.push(selected.rate_id);
  }
  return out;
}
