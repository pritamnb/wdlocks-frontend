/**
 * Example promo codes for the test checkouts only (server only).
 *
 * The shop has no coupons (none of its orders has ever used one, 17 Nov 2026), so a promo code could not be shown
 * working anywhere. On the demo checkout (Vercel production) and on Stripe test mode (staging, stage 1) these codes
 * behave like WooCommerce coupons of the common kinds, with WooCommerce's own wording when they do not apply. They never
 * work where a real order can be made: not with a WooCommerce REST key (stage 2 / go-live) and not with live Stripe keys.
 * Any other code is still checked by WooCommerce, so "does not exist" behaves exactly as on the live shop.
 */
import { splitVat, type BasketLineInput } from '@/lib/basket';
import { isDemoCheckout } from '@/lib/demo-checkout';
import { CouponError } from '@/lib/coupon';
import type { CouponQuote } from '@/types';

interface ExampleCoupon {
  /** WooCommerce discount_type. */
  type: 'percent' | 'fixed_cart';
  /** percent: 10 = 10 %; fixed_cart: pence off, inc VAT (the shop's prices include VAT). */
  amount: number;
  /** Items subtotal (inc VAT, pence) the basket must reach. */
  minimumPence?: number;
  expired?: boolean;
}

export const EXAMPLE_COUPONS: Readonly<Record<string, ExampleCoupon>> = {
  example10: { type: 'percent', amount: 10 },
  example5: { type: 'fixed_cart', amount: 500 },
  example50: { type: 'fixed_cart', amount: 1000, minimumPence: 5000 },
  exampleold: { type: 'percent', amount: 15, expired: true },
};

/** Only on a checkout that can never create a real order or charge a real card. */
export function exampleCouponsEnabled(): boolean {
  const wcKey = Boolean(process.env.WC_CONSUMER_KEY && process.env.WC_CONSUMER_SECRET);
  const liveStripe = (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_') || (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_live_');
  return isDemoCheckout() && !wcKey && !liveStripe;
}

export function isExampleCoupon(code: string): boolean {
  return exampleCouponsEnabled() && Object.hasOwn(EXAMPLE_COUPONS, code);
}

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/**
 * What an example code takes off lines worth `itemsPence` (inc VAT), as WooCommerce would quote it. Throws
 * CouponError 400 with WooCommerce's wording when it does not apply.
 */
export function quoteExampleCoupon(code: string, itemsPence: number): CouponQuote {
  const c = EXAMPLE_COUPONS[code];
  if (!c) throw new CouponError(400, 'coupon_invalid', `Coupon "${code}" does not exist!`);
  if (c.expired) throw new CouponError(400, 'coupon_invalid', 'This coupon has expired.');
  if (c.minimumPence && itemsPence < c.minimumPence) throw new CouponError(400, 'coupon_invalid', `The minimum spend for this coupon is ${pounds(c.minimumPence)}.`);
  const inc = Math.min(itemsPence, c.type === 'percent' ? Math.round((itemsPence * c.amount) / 100) : c.amount);
  const { ex, tax } = splitVat(inc);
  return { code, discountType: c.type, discountPence: inc, discountExPence: ex, discountTaxPence: tax };
}

/** Items subtotal for the example quote from the basket lines and their inc-VAT unit prices. */
export function itemsSubtotal(items: readonly BasketLineInput[], unitPence: (id: number) => number): number {
  return items.reduce((n, i) => n + unitPence(i.id) * i.quantity, 0);
}
