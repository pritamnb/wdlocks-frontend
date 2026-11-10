import type { Metadata } from 'next';
import { SITE, SITE_URL, TRADE } from '@/lib/constants';
import { TradeCloser, TradeHero, TradeReasons, TradeSteps } from '@/components/trade/TradeSections';
import { TradeForm } from '@/components/trade/TradeForm';
import { ProductFaq } from '@/components/product/ProductFaq';
import { Accreditations } from '@/components/home/Accreditations';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Trade accounts for locksmiths and installers',
  description: 'Open a Watchdog trade account. 3 Star Kitemark, Sold Secure Diamond and Secured by Design cylinders, keyed-alike suites and keys cut to number, with a £5,000 guarantee for your customers.',
  alternates: { canonical: `${SITE_URL}/trade` },
  openGraph: { title: `Trade accounts | ${SITE.name}`, description: 'Fit the lock you can stand behind. Apply for a Watchdog trade account.', url: `${SITE_URL}/trade`, type: 'website' },
};

export default function TradePage() {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Trade', item: `${SITE_URL}/trade` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <TradeHero />
      <TradeReasons />
      <TradeSteps />
      <TradeForm />
      <section className="bg-cream pb-20 lg:pb-28">
        <div className="container-wd">
          <ProductFaq items={[...TRADE.faq]} title="Trade questions, answered" />
        </div>
      </section>
      <Accreditations />
      <TradeCloser />
    </>
  );
}
