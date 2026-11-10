import type { Metadata } from 'next';
import { SITE, SITE_URL } from '@/lib/constants';
import { TruthsBanner } from '@/components/truths/TruthsBanner';
import { TruthsSlider } from '@/components/truths/TruthsSlider';
import { CrimeChecker } from '@/components/truths/CrimeChecker';
import { BehindWatchdog } from '@/components/truths/BehindWatchdog';
import { Accreditations } from '@/components/home/Accreditations';
import { Guarantee } from '@/components/home/Guarantee';
import { BuyBand } from '@/components/home/BuyBand';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Home truths: the facts behind British burglary',
  description:
    '63% of burglaries happen while someone is at home and 77% of burglars come through a door. Check recorded crime around your postcode and see why Watchdog treats the front door as the front line.',
  alternates: { canonical: `${SITE_URL}/home-truths` },
  openGraph: {
    title: `Home truths | ${SITE.name}`,
    description: 'The facts behind British burglary, from the ONS Crime Survey, plus a postcode crime checker powered by Police data.',
    url: `${SITE_URL}/home-truths`,
    type: 'website',
  },
};

export default function HomeTruthsPage() {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Home truths', item: `${SITE_URL}/home-truths` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <TruthsBanner />
      <TruthsSlider />
      <CrimeChecker />
      <BehindWatchdog />
      <Accreditations />
      <Guarantee />
      <BuyBand />
    </>
  );
}
