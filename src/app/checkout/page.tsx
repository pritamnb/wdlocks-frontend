import type { Metadata } from 'next';
import { CheckoutPage } from '@/components/checkout/CheckoutPage';
import { CheckoutReview } from '@/components/cart/CheckoutReview';
import { CHECKOUT_MODE } from '@/lib/constants';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

/**
 * With Stripe keys configured the checkout runs on this domain. Until then shoppers get the review page that hands the
 * basket to wdlocks.co.uk; the on-site checkout can be previewed at /checkout?preview=1 (address, delivery and coupons
 * are live; payment still hands off).
 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const preview = params.preview === '1' || params.preview === 'stripe';
  if (CHECKOUT_MODE === 'stripe' || CHECKOUT_MODE === 'demo') return <CheckoutPage />;
  if (preview) return <CheckoutPage preview />;
  return <CheckoutReview />;
}
