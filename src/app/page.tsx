import type { Metadata } from 'next';
import { getProductsSSR } from '@/lib/api';
import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { WhyWatchdog } from '@/components/home/WhyWatchdog';
import { Reviews } from '@/components/home/Reviews';
import { Delivery } from '@/components/home/Delivery';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ButtonLink } from '@/components/ui/Button';
import { PRODUCT_IDS, SITE, SITE_URL } from '@/lib/constants';

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} | BSI Kitemarked 3 Star Euro Cylinder Locks` },
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const products = await getProductsSSR();
  const hero = products.find((p) => p.id === PRODUCT_IDS.CYLINDER_LOCK);

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/wd-locks-logo.png`,
    email: SITE.email,
    telephone: SITE.phone,
    sameAs: [],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <Hero imageSrc={hero?.images[0]?.src} imageAlt={hero?.images[0]?.alt} />
      <TrustStrip />

      <section className="py-20" aria-labelledby="products-title">
        <div className="container-wd">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Shop</p>
              <h2 id="products-title" className="heading-display mt-3 text-3xl sm:text-4xl">Locks, keys and aftercare.</h2>
            </div>
            <ButtonLink href="/products" variant="secondary" size="sm">
              View all products
            </ButtonLink>
          </div>
          <ProductGrid products={products} limit={8} />
        </div>
      </section>

      <WhyWatchdog />
      <Reviews />
      <Delivery />
    </>
  );
}
