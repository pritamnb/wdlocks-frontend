import Image from 'next/image';
import Link from 'next/link';
import { CATALOGUE, SITE, WC_BASE, TRUST_SIGNALS, BROCHURE } from '@/lib/constants';

const helpLinks = [
  { label: 'Sizing guide', href: '/products/3-star-alps-cylinder-door-lock#sizing' },
  { label: 'Delivery & dispatch', href: '/#delivery' },
  { label: 'Guarantee registration', href: `${WC_BASE}/guarantee-registration/`, external: true },
  { label: 'Brochure (PDF)', href: BROCHURE.href, external: true },
  { label: 'Trade application', href: `${WC_BASE}/trade-application/`, external: true },
  { label: 'Terms & conditions', href: `${WC_BASE}/terms-and-conditions/`, external: true },
];

const companyLinks = [
  { label: 'Why Watchdog', href: '/#why-watchdog' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'Blog', href: `${WC_BASE}/my-blog/`, external: true },
  { label: 'Contact', href: '/#contact' },
];

function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const cls = 'text-sm text-white/75 transition-colors duration-150 hover:text-red';
  return external ? (
    <a href={href} className={cls} rel="noopener">{label}</a>
  ) : (
    <Link href={href} className={cls}>{label}</Link>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-white/10 bg-near-black text-white" id="contact">
      <div className="container-wd grid grid-cols-2 gap-10 py-14 md:grid-cols-4">
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Products</h2>
          <ul className="space-y-2.5">
            {CATALOGUE.map((p) => (
              <li key={p.id}><FooterLink href={`/products/${p.slug}`} label={p.shortName} /></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Help</h2>
          <ul className="space-y-2.5">
            {helpLinks.map((l) => <li key={l.label}><FooterLink {...l} /></li>)}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Company</h2>
          <ul className="space-y-2.5">
            {companyLinks.map((l) => <li key={l.label}><FooterLink {...l} /></li>)}
          </ul>
          <address className="mt-6 space-y-1 text-sm not-italic text-white/75">
            <a href={SITE.phoneHref} className="block font-medium text-white hover:text-red">{SITE.phone}</a>
            <a href={SITE.freephoneHref} className="block hover:text-red">Freephone {SITE.freephone}</a>
            <a href={`mailto:${SITE.email}`} className="block hover:text-red">{SITE.email}</a>
          </address>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Trusted &amp; accredited</h2>
          <ul className="space-y-3">
            {TRUST_SIGNALS.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                {t.image ? (
                  <Image src={t.image} alt="" width={40} height={40} className="h-10 w-10 rounded-md bg-warm-white object-contain p-1" />
                ) : (
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md bg-warm-white text-red">◆</span>
                )}
                <div>
                  <span className="block text-sm font-medium text-white">{t.label}</span>
                  <span className="block text-xs text-white/60">{t.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-wd flex flex-col items-start justify-between gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center">
          <p>© {year} {SITE.name}. All rights reserved.</p>
          <p>Secure checkout at wdlocks.co.uk · Prices include VAT</p>
        </div>
      </div>
    </footer>
  );
}
