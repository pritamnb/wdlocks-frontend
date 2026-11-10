import type { ReactNode } from 'react';
import { CONTACT, SITE } from '@/lib/constants';

const icons = {
  phone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>,
  mail: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  pin: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  clock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};

/** Three dark quick-action tiles under the title: call, email, visit. */
export function QuickActions() {
  const tiles = [
    { icon: icons.phone, title: 'Call us', body: `${SITE.phone} · Freephone ${SITE.freephone}`, href: SITE.phoneHref, cta: 'Call now' },
    { icon: icons.mail, title: 'Email us', body: SITE.email, href: `mailto:${SITE.email}`, cta: 'Write to us' },
    { icon: icons.pin, title: 'Visit the shop', body: `${CONTACT.address.line1}, ${CONTACT.address.postcode}`, href: '#visit', cta: 'Find us' },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-3" aria-label="Quick ways to reach us">
      {tiles.map((t) => (
        <li key={t.title}>
          <a href={t.href} className="group flex h-full flex-col rounded-2xl bg-near-black p-6 text-white transition-colors hover:bg-[#1b1a1c]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red text-white">{t.icon}</span>
            <span className="mt-5 text-lg font-semibold">{t.title}</span>
            <span className="mt-1 text-sm text-white/70">{t.body}</span>
            <span className="mt-4 text-sm font-semibold text-red underline-offset-4 group-hover:underline">{t.cta} →</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Card({ icon, title, children, className }: { icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-warm-white p-7 shadow-card ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10 text-red">{icon}</span>
        <h2 className="heading-display text-2xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const pill = 'inline-flex h-12 items-center justify-center rounded-full bg-near-black px-6 text-sm font-semibold text-white transition-colors hover:bg-red';

/** Ultion's "Give us a call" card. */
export function CallCard() {
  return (
    <Card icon={icons.phone} title="Give us a call">
      <p className="mt-4 text-sm text-charcoal/75">We are just a phone call away. Sales and sizing advice on the main line, or free from a landline or mobile.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href={SITE.phoneHref} className={pill}>{SITE.phone}</a>
        <a href={SITE.freephoneHref} className="inline-flex h-12 items-center justify-center rounded-full border border-charcoal/20 px-6 text-sm font-semibold text-near-black transition-colors hover:border-red hover:text-red">
          Freephone {SITE.freephone}
        </a>
      </div>
      <p className="mt-5 flex items-start gap-2 text-sm text-charcoal/75">
        <span className="mt-0.5 text-red">{icons.clock}</span>
        <span>
          Locked out? <a href={CONTACT.emergency.href} rel="noopener" target="_blank" className="font-semibold text-red underline-offset-4 hover:underline">{CONTACT.emergency.label} →</a>
        </span>
      </p>
    </Card>
  );
}

/** Ultion's "Send us an email" card, with the socials. */
export function EmailCard() {
  return (
    <Card icon={icons.mail} title="Send us an email">
      <p className="mt-4 text-sm text-charcoal/75">Prefer to email? Drop us a note on the address below and we will get back to you.</p>
      <a href={`mailto:${SITE.email}`} className={`${pill} mt-5`}>{SITE.email}</a>
      <ul className="mt-5 flex gap-4 text-sm font-medium">
        {CONTACT.social.map((s) => (
          <li key={s.label}>
            <a href={s.href} rel="noopener" target="_blank" className="text-charcoal/80 underline-offset-4 hover:text-red hover:underline">{s.label} ↗</a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Full-width shop card: address on the left, map on the right. */
export function VisitCard() {
  const { lat, lng } = CONTACT.mapCentre;
  const d = 0.006;
  const bbox = `${(lng - d * 1.6).toFixed(4)},${(lat - d).toFixed(4)},${(lng + d * 1.6).toFixed(4)},${(lat + d).toFixed(4)}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const directions = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  return (
    <div id="visit" className="grid scroll-mt-28 overflow-hidden rounded-2xl bg-warm-white shadow-card lg:grid-cols-[0.9fr_1.1fr]">
      <div className="p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10 text-red">{icons.pin}</span>
          <h2 className="heading-display text-2xl">Visit the shop</h2>
        </div>
        <address className="mt-5 text-base not-italic leading-relaxed text-charcoal/80">
          <span className="font-semibold text-near-black">Watchdog Locksmiths</span>
          <br />
          {CONTACT.address.line1}
          <br />
          {CONTACT.address.town}
          <br />
          {CONTACT.address.postcode}
        </address>
        <p className="mt-4 text-sm text-charcoal/70">On Greenford Road in the heart of Greenford, with locks, keys and advice over the counter.</p>
        <a href={directions} rel="noopener" target="_blank" className={`${pill} mt-6`}>Open in maps</a>
      </div>
      <div className="relative min-h-[280px] bg-cream lg:min-h-full">
        <iframe title={`Map of ${CONTACT.address.line1}, ${CONTACT.address.postcode}`} src={src} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full border-0 grayscale-[0.3]" />
      </div>
    </div>
  );
}
