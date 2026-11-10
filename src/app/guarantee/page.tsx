import type { Metadata } from 'next';
import { GUARANTEE, GUARANTEE_PAGE, SITE, SITE_URL } from '@/lib/constants';
import { ActivationPanel } from '@/components/guarantee/ActivationPanel';
import { Covered, HowToClaim, KeepValid, KeyControl } from '@/components/guarantee/GuaranteeSections';
import { ProductFaq } from '@/components/product/ProductFaq';
import { Accreditations } from '@/components/home/Accreditations';
import { BuyBand } from '@/components/home/BuyBand';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Activate your ${GUARANTEE.amountLabel} security guarantee`,
  description:
    'Register your Watchdog lock and key number in two minutes. If a burglar snaps a registered Watchdog lock within 5 years, we pay the first £5,000 of your uninsured loss. Free, with key-copy protection for life.',
  alternates: { canonical: `${SITE_URL}/guarantee` },
  openGraph: {
    title: `${GUARANTEE.amountLabel} security guarantee | ${SITE.name}`,
    description: 'Register your Watchdog lock and key number. £5,000 if a burglar snaps it, key-copy protection for life, nothing to pay.',
    url: `${SITE_URL}/guarantee`,
    type: 'website',
  },
};

export default function GuaranteePage() {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Guarantee', item: `${SITE_URL}/guarantee` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <ActivationPanel />
      <Covered />
      <HowToClaim />
      <KeepValid />
      <KeyControl />
      <section className="bg-cream pb-20 lg:pb-28">
        <div className="container-wd">
          <ProductFaq items={[...GUARANTEE_PAGE.faq]} title="Guarantee questions, answered" />
        </div>
      </section>
      <Accreditations />
      <BuyBand />
    </>
  );
}
