import type { Metadata } from 'next';
import { getProductsSSR } from '@/lib/api';
import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { HomeTruths } from '@/components/home/HomeTruths';
import { Turntable } from '@/components/home/Turntable';
import { InsideTheLock } from '@/components/home/InsideTheLock';
import { WhyWatchdog } from '@/components/home/WhyWatchdog';
import { Guarantee } from '@/components/home/Guarantee';
import { Reviews } from '@/components/home/Reviews';
import { Delivery } from '@/components/home/Delivery';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ButtonLink } from '@/components/ui/Button';
import { SITE, SITE_URL } from '@/lib/constants';

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} | BSI Kitemarked 3 Star Euro Cylinder Locks` },
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const products = await getProductsSSR();

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/watchdog-stays-locked.png`,
    email: SITE.email,
    telephone: SITE.phone,
    sameAs: [],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <Hero />
      <TrustStrip />

      <section className="py-20" aria-labelledby="products-title">
        <div className="container-wd">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Our products</span>
              <h2 id="products-title" className="heading-display mt-4 text-3xl sm:text-4xl">Find the right protection for your door.</h2>
              <p className="mt-3 max-w-2xl text-charcoal/80">Euro cylinders, thumb turns and rim cylinders for every UK door, plus genuine keys and aftercare. Every lock ships with three keys.</p>
            </div>
            <ButtonLink href="/products" variant="secondary" size="sm">
              View all products
            </ButtonLink>
          </div>
          <ProductGrid products={products} limit={8} />
        </div>
      </section>

      <Turntable />
      <InsideTheLock />
      <WhyWatchdog />
      <HomeTruths />
      <Guarantee />
      <Reviews />
      <Delivery />
    </>
  );
}
