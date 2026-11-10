import type { Metadata } from 'next';
import { CONTACT, SITE, SITE_URL } from '@/lib/constants';
import { CallbackForm, MessageForm } from '@/components/contact/ContactForms';
import { CallCard, EmailCard, QuickActions, VisitCard } from '@/components/contact/ContactCards';
import { TrustStrip } from '@/components/home/TrustStrip';
import { BuyBand } from '@/components/home/BuyBand';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Contact us: talk to an expert',
  description: `Request a callback, call ${SITE.phone}, email ${SITE.email} or visit the Watchdog shop in Greenford. Sizing advice, orders, extra keys and guarantee questions.`,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: { title: `Contact | ${SITE.name}`, description: 'Talk to an expert about Watchdog locks, keys and the £5,000 guarantee.', url: `${SITE_URL}/contact`, type: 'website' },
};

export default function ContactPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE_URL,
    email: SITE.email,
    telephone: SITE.phone,
    address: { '@type': 'PostalAddress', streetAddress: CONTACT.address.line1, addressLocality: 'Greenford', addressRegion: 'Middlesex', postalCode: CONTACT.address.postcode, addressCountry: CONTACT.address.country },
    contactPoint: [
      { '@type': 'ContactPoint', telephone: SITE.phone, contactType: 'sales', areaServed: 'GB', availableLanguage: 'en' },
      { '@type': 'ContactPoint', telephone: SITE.freephone, contactType: 'customer service', areaServed: 'GB', availableLanguage: 'en' },
    ],
    sameAs: CONTACT.social.map((s) => s.href),
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Contact', item: `${SITE_URL}/contact` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <section className="bg-cream pt-16 lg:pt-24" aria-labelledby="contact-h1">
        <div className="container-wd">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Here to help</span>
            <h1 id="contact-h1" className="heading-display mt-5 text-5xl sm:text-6xl lg:text-7xl">Talk to an expert.</h1>
            <p className="mx-auto mt-5 max-w-xl text-charcoal/75">Our team fits and sells Watchdog locks every day. Whatever the question, from sizing to a guarantee claim, they are on hand to answer it.</p>
          </div>
          <div className="mt-12">
            <QuickActions />
          </div>
        </div>
      </section>

      <section className="bg-cream py-14 lg:py-20" aria-label="Request a callback or send a message">
        <div className="container-wd grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-warm-white p-7 shadow-card sm:p-8">
            <CallbackForm />
          </div>
          <div className="rounded-2xl bg-warm-white p-7 shadow-card sm:p-8">
            <MessageForm />
          </div>
        </div>
      </section>

      <section className="bg-cream pb-20 lg:pb-28" aria-label="Call, email or visit">
        <div className="container-wd grid gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <CallCard />
            <EmailCard />
          </div>
          <VisitCard />
        </div>
      </section>

      <TrustStrip compact />
      <BuyBand />
    </>
  );
}
