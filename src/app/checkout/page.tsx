import type { Metadata } from 'next';
import { CheckoutReview } from '@/components/cart/CheckoutReview';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

export default function Page() {
  return <CheckoutReview />;
}
