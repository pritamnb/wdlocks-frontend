import Image from 'next/image';
import { BEHIND_WATCHDOG, BRAND_RENDERS } from '@/lib/constants';

/**
 * Stands in for Ultion's founder quote + milestones. Watchdog has no verified founder story or dated timeline, so this
 * is a statement from wdlocks.co.uk plus three fact tiles that each have a public source.
 */
export function BehindWatchdog() {
  return (
    <section className="bg-cream py-20 lg:py-28" aria-labelledby="behind-title">
      <div className="container-wd">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">Meet the people behind Watchdog</p>
            <h2 id="behind-title" className="heading-display mt-4 text-3xl sm:text-4xl lg:text-5xl">
              <span className="text-charcoal/70">“</span>{BEHIND_WATCHDOG.statement}<span className="text-charcoal/70">”</span>
            </h2>
            <p className="mt-5 text-sm font-medium text-charcoal/70">{BEHIND_WATCHDOG.attribution}</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(218_21_25/0.12),transparent_65%)]" aria-hidden="true" />
            <Image
              src={BRAND_RENDERS.guaranteeKeytag.src}
              alt={BRAND_RENDERS.guaranteeKeytag.alt}
              width={BRAND_RENDERS.guaranteeKeytag.width}
              height={BRAND_RENDERS.guaranteeKeytag.height}
              sizes="(min-width: 1024px) 380px, 70vw"
              className="relative mx-auto w-full object-contain drop-shadow-[0_30px_40px_rgb(0_0_0/0.25)]"
            />
          </div>
        </div>

        <ol className="mt-16 grid gap-4 border-t border-charcoal/10 pt-10 sm:grid-cols-3">
          {BEHIND_WATCHDOG.facts.map((f, i) => (
            <li key={f.title} className="rounded-2xl bg-warm-white p-6 shadow-card">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-red">
                <span className="font-playfair text-2xl font-semibold leading-none text-near-black" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {f.eyebrow}
              </p>
              <h3 className="heading-display mt-4 text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{f.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
