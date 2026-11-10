import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { GUARANTEE, SITE } from '@/lib/constants';

export function Hero({ imageSrc, imageAlt }: { imageSrc?: string; imageAlt?: string }) {
  return (
    <section className="cream-panel relative overflow-hidden border-b border-cream-dark" aria-labelledby="hero-title">
      <div className="container-wd grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:gap-8 lg:py-24">
        <div className="lg:col-span-6">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream-dark bg-warm-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/75">
            <span className="h-1.5 w-1.5 rounded-full bg-red" aria-hidden="true" />
            Watchdog 3 Star ALPS · Kitemarked · Sold Secure Diamond
          </p>
          <h1 id="hero-title" className="heading-display text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
            A snapped lock takes <span className="text-red">seconds</span>.<br className="hidden sm:block" /> A Watchdog doesn&rsquo;t snap.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal/85">
            {SITE.tagline} The 3 Star ALPS euro cylinder locks itself the moment you remove the key, resists snapping,
            bumping, drilling and picking, and fits in five minutes with one screwdriver.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/products/3-star-alps-cylinder-door-lock" size="lg">
              Get a Watchdog lock
            </ButtonLink>
            <ButtonLink href="/products/3-star-alps-cylinder-door-lock#sizing" variant="secondary" size="lg">
              Find my size
            </ButtonLink>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-cream-dark pt-6 text-sm">
            <div>
              <dt className="text-charcoal/75">Security rating</dt>
              <dd className="mt-0.5 font-semibold text-near-black">3 Star Kitemark TS 007</dd>
            </div>
            <div>
              <dt className="text-charcoal/75">Key combinations</dt>
              <dd className="mt-0.5 font-semibold text-near-black">800,000+ · 11 pins</dd>
            </div>
            <div>
              <dt className="text-charcoal/75">Dispatch</dt>
              <dd className="mt-0.5 font-semibold text-near-black">Same day before {SITE.dispatchCutoff}</dd>
            </div>
          </dl>
        </div>
        <div className="relative lg:col-span-6">
          <div className="group relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[2rem] bg-warm-white shadow-card ring-1 ring-cream-dark">
            <Image
              src={imageSrc ?? '/brand/watchdog-logo.png'}
              alt={imageAlt ?? 'Watchdog 3 Star ALPS Cylinder Lock'}
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 560px"
              className="brighten-img object-contain p-10"
            />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-warm-white/90 px-3 py-1.5 text-xs font-semibold text-charcoal shadow-sm ring-1 ring-cream-dark">
              <Image src="/brand/bsi-kitemark.webp" alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
              Kitemark TS 007 3★
            </div>
          </div>
          <a
            href={GUARANTEE.registerUrl}
            rel="noopener"
            className="group absolute -bottom-5 left-4 flex items-center gap-4 rounded-2xl bg-navy px-5 py-4 text-white shadow-xl ring-1 ring-blue-grey/30 transition-transform duration-150 hover:-translate-y-0.5 sm:left-8"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-grey">Protected by Watchdog</p>
              <p className="font-playfair text-lg font-semibold leading-tight">Get your {GUARANTEE.amountLabel} guarantee</p>
            </div>
            <span className="inline-flex h-9 items-center rounded-full bg-red px-3.5 text-sm font-semibold transition-colors duration-150 group-hover:bg-red-deep">Activate</span>
          </a>
        </div>
      </div>
    </section>
  );
}
