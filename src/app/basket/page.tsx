import type { Metadata } from 'next';
import { getProductsSSR } from '@/lib/api';
import { BasketPage } from '@/components/cart/BasketPage';

export const metadata: Metadata = { title: 'Your basket', robots: { index: false, follow: true } };
export const revalidate = 60;

export default async function Page() {
  const products = await getProductsSSR();
  return <BasketPage products={products} />;
}
