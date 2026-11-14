import Image from 'next/image';
import Link from 'next/link';
import type { WooProduct } from '@/types';
import { CONTACT, SITE, TRUST_SIGNALS, BROCHURE } from '@/lib/constants';
import { catalogueEntry } from '@/lib/catalogue';
import { CookieSettingsLink } from '@/components/layout/CookieSettingsLink';

const helpLinks = [
  { label: 'Sizing guide', href: '/products/3-star-alps-cylinder-door-lock#sizing' },
  { label: 'Delivery & dispatch', href: '/#delivery' },
  { label: 'Guarantee registration', href: '/guarantee' },
  { label: 'Brochure (PDF)', href: BROCHURE.href, external: true },
  { label: 'Trade application', href: '/trade' },
  { label: 'Terms & conditions', href: '/terms' },
  { label: 'Privacy policy', href: '/privacy' },
];

const companyLinks = [
  { label: 'Why Watchdog', href: '/#why-watchdog' },
  { label: 'Home truths', href: '/home-truths' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

const footerLinkClass = 'text-sm text-white/75 transition-colors duration-150 hover:text-red';

function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const cls = footerLinkClass;
  return external ? (
    <a href={href} className={cls} rel="noopener">{label}</a>
  ) : (
    <Link href={href} className={cls}>{label}</Link>
  );
}

export function Footer({ products }: { products: readonly WooProduct[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-white/10 bg-near-black text-white" id="contact">
      {/* Phones: one tidy stack (brand + buttons side by side, products in two columns, help/company side by side,
          accreditations 2 × 2); from md the five-column layout. */}
      <div className="container-wd grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-5 md:py-14">
        <div className="col-span-2 md:col-span-1">
          <p className="font-playfair text-xl font-semibold text-white md:text-lg">Watchdog. Stays locked.</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-1">
            <Link href="/products/watchdog-3-star-alps-extra-keys" className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-red px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">Get Watchdog keys</Link>
            <a href="/guarantee" className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md border border-white/30 px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white hover:text-near-black">Activate guarantee</a>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Products</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-1">
            {products.map(catalogueEntry).map((p) => (
              <li key={p.id}><FooterLink href={`/products/${p.slug}`} label={p.shortName} /></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Help</h2>
          <ul className="space-y-2.5">
            {helpLinks.map((l) => <li key={l.label}><FooterLink {...l} /></li>)}
            <li><CookieSettingsLink className={footerLinkClass} /></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Company</h2>
          <ul className="space-y-2.5">
            {companyLinks.map((l) => <li key={l.label}><FooterLink {...l} /></li>)}
          </ul>
          <address className="mt-5 space-y-1.5 text-sm not-italic text-white/75">
            <a href={SITE.phoneHref} className="block whitespace-nowrap font-medium text-white hover:text-red">{SITE.phone}</a>
            <a href={SITE.freephoneHref} className="block whitespace-nowrap hover:text-red">Freephone {SITE.freephone}</a>
            <a href={`mailto:${SITE.email}`} className="block break-all hover:text-red">{SITE.email}</a>
          </address>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Trusted &amp; accredited</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-1">
            {TRUST_SIGNALS.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                {t.image ? (
                  <Image src={t.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md bg-warm-white object-contain p-1" />
                ) : (
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warm-white text-red">◆</span>
                )}
                <div className="min-w-0">
                  <span className="block text-sm font-medium leading-tight text-white">{t.label}</span>
                  <span className="block text-xs leading-snug text-white/60">{t.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-wd flex flex-col items-center justify-between gap-3 py-5 text-center text-xs text-white/60 sm:flex-row sm:text-left">
          <p>© {year} {SITE.name}. All rights reserved.</p>
          <ul className="flex items-center gap-2" aria-label="Social media">
            {CONTACT.social.map((s) => (
              <li key={s.label}>
                <a href={s.href} rel="noopener" target="_blank" aria-label={`${SITE.name} on ${s.label}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-red hover:bg-red hover:text-white">
                  {s.label === 'Facebook' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.4V14h2.8v8h3.3Z" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                  )}
                </a>
              </li>
            ))}
          </ul>
          <p>Secure checkout at wdlocks.co.uk · Prices include VAT</p>
        </div>
      </div>
    </footer>
  );
}
