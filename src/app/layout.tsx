import type { Metadata, Viewport } from 'next';
import { outfit } from '@/lib/fonts';
import { RootLayout as SiteChrome } from '@/components/layout/RootLayout';
import { IS_PRODUCTION_SITE, SITE, SITE_URL } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} | BSI Kitemarked 3 Star Euro Cylinder Locks`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ['euro cylinder lock', '3 star cylinder', 'anti-snap lock', 'BSI Kitemark', 'Sold Secure Diamond', 'thumb turn lock', 'rim cylinder'],
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    siteName: SITE.name,
    url: SITE_URL,
    title: `${SITE.name} | BSI Kitemarked 3 Star Euro Cylinder Locks`,
    description: SITE.description,
    // app/opengraph-image.tsx is picked up automatically and added here by Next.
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} | BSI Kitemarked 3 Star Euro Cylinder Locks`,
    description: SITE.description,
  },
  // Only the live address is indexed; preview, staging and test copies say noindex (src/lib/site-flags.ts).
  robots: IS_PRODUCTION_SITE ? { index: true, follow: true } : { index: false, follow: false },
  // Same tokens the WordPress site serves, so the existing Search Console and Meta domain verifications survive cutover.
  verification: {
    google: ['ekgPg_mbvWC66sp-DGiSTyl6gDoDZAnfJf9X778_UNE', 'mLwQfI66BfRMyoIe6eeXWxQx8QfREWjyosnVE4NKAz8'],
    other: { 'facebook-domain-verification': 'b9jbj0o5lwkurowscxn4bejtni594b' },
  },
};

export const viewport: Viewport = {
  themeColor: '#F8F3EC',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-cream text-charcoal">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
