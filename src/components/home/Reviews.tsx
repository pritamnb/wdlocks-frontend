import { TRUSTPILOT_URL, SITE } from '@/lib/constants';

/**
 * Reviews block. Deliberately contains no hard-coded quotes — pull real reviews from the
 * Trustpilot widget/API before go-live rather than shipping invented testimonials.
 */
export function Reviews() {
  return (
    <section id="reviews" className="scroll-mt-24 bg-near-black py-20 text-white" aria-labelledby="reviews-title">
      <div className="container-wd grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Reviews</p>
          <h2 id="reviews-title" className="heading-display mt-3 text-3xl text-white sm:text-4xl">
            Fitted by locksmiths. Trusted by homeowners.
          </h2>
          <p className="mt-4 max-w-lg text-white/75">
            Watchdog is a Checkatrade-vetted business and its cylinders are fitted across the UK every week. Read
            independent reviews, or talk to us on {SITE.phone} before you buy.
          </p>
          <a
            href={TRUSTPILOT_URL}
            rel="noopener"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-near-black transition-colors duration-150 hover:bg-cream"
          >
            Read independent reviews
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { k: '3★', v: 'BSI Kitemark TS 007' },
            { k: '£5k', v: 'Security guarantee' },
            { k: '< 3pm', v: 'Same-day dispatch' },
          ].map((s) => (
            <div key={s.v} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="font-playfair text-4xl font-semibold text-white">{s.k}</p>
              <p className="mt-2 text-sm text-white/70">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
