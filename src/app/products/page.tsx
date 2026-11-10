import type { Metadata } from 'next';
import { getProductsSSR } from '@/lib/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumb } from '@/components/product/Breadcrumb';
import { TrustStrip } from '@/components/home/TrustStrip';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'All Products',
  description:
    'Shop Watchdog 3 Star ALPS euro cylinders, thumb turns, rim cylinders, half cylinders, extra keys and lock care. BSI Kitemarked, Sold Secure Diamond.',
  alternates: { canonical: '/products' },
};

export default async function ProductsPage() {
  const products = await getProductsSSR();
  return (
    <div className="bg-white"><div className="container-wd py-10 sm:py-14">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Products' }]} />
      <div className="mt-6 mb-10 max-w-2xl">
        <h1 className="heading-display text-4xl sm:text-5xl">All products</h1>
        <p className="mt-3 text-charcoal/80">
          Every Watchdog cylinder is BSI Kitemarked to TS 007 3-star and ships with three keys. Not sure of your size?
          Pick any cylinder and use the built-in sizing guide.
        </p>
      </div>
      <ProductGrid products={products} />
      <div className="mt-16">
        <TrustStrip compact />
      </div>
    </div></div>
  );
}
