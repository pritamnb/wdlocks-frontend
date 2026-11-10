import type { ReactNode } from 'react';
import { CONTACT, SITE } from '@/lib/constants';

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-warm-white p-7 shadow-card ${className ?? ''}`}>
      <h2 className="heading-display text-2xl">{title}</h2>
      {children}
    </div>
  );
}

const pill = 'inline-flex h-12 items-center justify-center rounded-full bg-near-black px-6 text-sm font-semibold text-white transition-colors hover:bg-red';

/** Ultion's "Give us a call" and "Send us an email" cards, plus the shop address with a map. */
export function CallCard() {
  return (
    <Card title="Give us a call">
      <p className="mt-2 text-sm text-charcoal/75">We are just a phone call away. Sales and sizing advice on the main line, or free from a landline or mobile.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href={SITE.phoneHref} className={pill}>{SITE.phone}</a>
        <a href={SITE.freephoneHref} className="inline-flex h-12 items-center justify-center rounded-full border border-charcoal/20 px-6 text-sm font-semibold text-near-black transition-colors hover:border-red hover:text-red">
          Freephone {SITE.freephone}
        </a>
      </div>
      <p className="mt-5 text-sm text-charcoal/75">
        Locked out?{' '}
        <a href={CONTACT.emergency.href} rel="noopener" target="_blank" className="font-semibold text-red underline-offset-4 hover:underline">{CONTACT.emergency.label} →</a>
      </p>
    </Card>
  );
}

export function EmailCard() {
  return (
    <Card title="Send us an email">
      <p className="mt-2 text-sm text-charcoal/75">Prefer to email? Drop us a note on the address below and we will get back to you.</p>
      <a href={`mailto:${SITE.email}`} className={`${pill} mt-5`}>{SITE.email}</a>
      <ul className="mt-5 flex gap-4 text-sm font-medium">
        {CONTACT.social.map((s) => (
          <li key={s.label}>
            <a href={s.href} rel="noopener" target="_blank" className="text-charcoal/80 underline-offset-4 hover:text-red hover:underline">{s.label}</a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function VisitCard() {
  const { lat, lng } = CONTACT.mapCentre;
  const d = 0.006;
  const bbox = `${(lng - d * 1.6).toFixed(4)},${(lat - d).toFixed(4)},${(lng + d * 1.6).toFixed(4)},${(lat + d).toFixed(4)}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const directions = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  return (
    <Card title="Visit the shop" className="overflow-hidden !p-0">
      <div className="p-7 pb-5">
        <address className="mt-2 text-sm not-italic leading-relaxed text-charcoal/80">
          <span className="font-semibold text-near-black">Watchdog Locksmiths</span>
          <br />
          {CONTACT.address.line1}
          <br />
          {CONTACT.address.town}
          <br />
          {CONTACT.address.postcode}
        </address>
        <a href={directions} rel="noopener" target="_blank" className="mt-4 inline-block text-sm font-semibold text-red underline-offset-4 hover:underline">Open in maps →</a>
      </div>
      <div className="relative aspect-[16/9] w-full bg-cream">
        <iframe title={`Map of ${CONTACT.address.line1}, ${CONTACT.address.postcode}`} src={src} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full border-0 grayscale-[0.3]" />
      </div>
    </Card>
  );
}
