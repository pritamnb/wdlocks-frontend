import Image from 'next/image';
import { GUARANTEE } from '@/lib/constants';

export function Guarantee() {
  return (
    <section className="py-20" aria-labelledby="guarantee-title">
      <div className="container-wd">
        <div className="cream-panel grid items-center gap-8 overflow-hidden rounded-[2rem] border border-cream-dark p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Protected by Watchdog</p>
            <h2 id="guarantee-title" className="heading-display mt-3 text-3xl sm:text-4xl">
              Register your lock. Activate your {GUARANTEE.amountLabel} guarantee.
            </h2>
            <p className="mt-4 max-w-lg text-charcoal/85">{GUARANTEE.blurb} With key-copy protection, nobody can have a key cut to your number without your say-so.</p>
            <a
              href={GUARANTEE.registerUrl}
              rel="noopener"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep"
            >
              Activate my guarantee <span aria-hidden="true">↗</span>
            </a>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Accreditations">
            {[
              { src: '/brand/bsi-kitemark.webp', label: 'BSI Kitemark', detail: 'TS 007 3 Star' },
              { src: '/brand/sold-secure-diamond.png', label: 'Sold Secure', detail: 'Diamond 2024' },
              { src: '/brand/secured-by-design.png', label: 'Secured by Design', detail: 'Police preferred' },
              { src: '/brand/checkatrade.png', label: 'Checkatrade', detail: 'Vetted installer' },
              { src: '/brand/as-seen-on-sky-sports.png', label: 'As seen on', detail: 'Sky Sports' },
              { src: '/brand/watchdog-logo.png', label: 'Watchdog', detail: 'Stays locked' },
            ].map((b) => (
              <li key={b.label} className="group flex flex-col items-center rounded-2xl border border-cream-dark bg-warm-white p-4 text-center transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card">
                <div className="relative h-12 w-full">
                  <Image src={b.src} alt="" fill sizes="120px" className="brighten-img object-contain" />
                </div>
                <p className="mt-3 text-sm font-semibold text-near-black">{b.label}</p>
                <p className="text-xs text-charcoal/75">{b.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
