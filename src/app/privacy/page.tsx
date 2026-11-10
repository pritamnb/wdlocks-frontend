import type { Metadata } from 'next';
import { SITE_URL, WC_BASE } from '@/lib/constants';
import { getPage } from '@/lib/wp';
import { LegalPage } from '@/components/legal/LegalPage';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How Watchdog Locksmith Ltd collects, uses and protects your personal information.',
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default async function PrivacyPage() {
  const page = await getPage('privacy-policy');
  return <LegalPage page={page} title="Privacy policy" intro="How we collect, use and protect your personal information when you buy from us, register a guarantee or get in touch." fallbackHref={`${WC_BASE}/privacy-policy/`} />;
}
