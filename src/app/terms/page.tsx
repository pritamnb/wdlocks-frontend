import type { Metadata } from 'next';
import { SITE_URL, WC_BASE } from '@/lib/constants';
import { getPage } from '@/lib/wp';
import { LegalPage } from '@/components/legal/LegalPage';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Terms and conditions',
  description: 'The terms on which Watchdog Locksmith Ltd supplies products, including the £5,000 burglary guarantee (clause 14).',
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default async function TermsPage() {
  const page = await getPage('terms');
  return <LegalPage page={page} title="Terms and conditions" intro="The terms on which Watchdog Locksmith Ltd supplies products to you. The £5,000 burglary guarantee is clause 14." fallbackHref={`${WC_BASE}/terms/`} />;
}
