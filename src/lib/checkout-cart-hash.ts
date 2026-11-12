import { createHash } from 'node:crypto';
import type { PricedBasket } from '@/lib/pricing';

/**
 * Stable fingerprint of what the shopper is about to pay for: item ids + quantities, the delivery option and the
 * grand total (pence). Addresses are deliberately NOT part of it: a changed address with the same basket reuses
 * the same pending order (we just update it). Always computed server-side from the re-priced basket.
 */
export function cartHash(basket: PricedBasket): string {
  const items = basket.lines.map((l) => [l.id, l.quantity] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const payload = JSON.stringify({ items, shipping: basket.shipping.id, total: basket.totalPence });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}
