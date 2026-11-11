import type { Metadata } from 'next';
import { CheckoutReturn } from '@/components/checkout/CheckoutReturn';

export const metadata: Metadata = { title: 'Order confirmation', robots: { index: false, follow: false } };

export default function Page() {
  return <CheckoutReturn />;
}
