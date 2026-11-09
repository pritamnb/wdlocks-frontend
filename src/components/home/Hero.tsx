import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { SITE } from '@/lib/constants';

export function Hero({ imageSrc, imageAlt }: { imageSrc?: string; imageAlt?: string }) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(218_21_25/0.10),transparent)]"
      />
      <div className="container-wd grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:gap-8 lg:py-28">
        <div className="lg:col-span-6">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream-dark bg-warm-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">
            <span className="h-1.5 w-1.5 rounded-full bg-red" aria-hidden="true" />
            TS 007 3-Star · Sold Secure Diamond
          </p>
          <h1 id="hero-title" className="heading-display text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-7xl">
            {SITE.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal/85">
            Watchdog 3 Star ALPS euro cylinders are BSI Kitemarked, anti-snap, anti-bump and anti-drill.
            Fitted in minutes, trusted by locksmiths, and dispatched the same day when you order before {SITE.dispatchCutoff}.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/products" size="lg">
              Shop locks
            </ButtonLink>
            <ButtonLink href="/products/3-star-alps-cylinder-door-lock#sizing" variant="secondary" size="lg">
              Find my size
            </ButtonLink>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-cream-dark pt-6 text-sm">
            <div>
              <dt className="text-charcoal/60">Rating</dt>
              <dd className="mt-0.5 font-semibold text-near-black">3 Star Kitemark</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Delivery</dt>
              <dd className="mt-0.5 font-semibold text-near-black">Free over £50</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Keys included</dt>
              <dd className="mt-0.5 font-semibold text-near-black">3 as standard</dd>
            </div>
          </dl>
        </div>
        <div className="relative lg:col-span-6">
          <div className="relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[2rem] bg-warm-white shadow-card">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={imageAlt ?? 'Watchdog 3 Star ALPS Cylinder Lock'}
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 560px"
                className="object-contain p-10"
              />
            ) : (
              <Image
                src="/brand/watchdog-logo.png"
                alt="Watchdog Locks"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 560px"
                className="object-contain p-20"
              />
            )}
          </div>
          <div className="absolute -bottom-4 left-4 rounded-2xl bg-near-black px-4 py-3 text-white shadow-xl sm:left-8">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Anti-snap guarantee</p>
            <p className="font-playfair text-lg font-semibold">Snaps safe, stays locked.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
