import type { Metadata } from 'next';
import { getProductsSSR } from '@/lib/api';
import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { VideoBar } from '@/components/home/VideoBar';
import { HomeTruths } from '@/components/home/HomeTruths';
import { Turntable } from '@/components/home/Turntable';
import { InsideTheLock } from '@/components/home/InsideTheLock';
import { WhyWatchdog } from '@/components/home/WhyWatchdog';
import { Guarantee } from '@/components/home/Guarantee';
import { BuyBand } from '@/components/home/BuyBand';
import { KeySection } from '@/components/home/KeySection';
import { KeyedAlikeSection } from '@/components/home/KeyedAlikeSection';
import { Accreditations } from '@/components/home/Accreditations';
import { Delivery } from '@/components/home/Delivery';
import { ProductGrid } from '@/components/product/ProductGrid';
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
      <TrustStrip tone="dark" />

      <section id="products" className="scroll-mt-24 py-20" aria-labelledby="products-title">
        <div className="container-wd">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Our products</span>
            <h2 id="products-title" className="heading-display mt-5 text-4xl sm:text-5xl">Find the right protection for you.</h2>
            <p className="mt-4 text-charcoal/80">Euro cylinders, thumb turns and rim cylinders for every UK door, plus genuine keys and aftercare. Every lock ships with three keys.</p>
          </div>
          <div className="mt-12">
            <ProductGrid products={products} />
          </div>
        </div>
      </section>

      <Turntable />
      <WhyWatchdog />
      <HomeTruths />
      <BuyBand />
      <KeySection />
      <KeyedAlikeSection />
      <InsideTheLock />
      <Guarantee />
      <VideoBar />
      <Accreditations />
      <Delivery />
    </>
  );
}
