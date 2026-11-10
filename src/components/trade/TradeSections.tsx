import Image from 'next/image';
import { BRAND_RENDERS, SITE, TRADE } from '@/lib/constants';

/** Dark hero in the Guarantee / Home-truths style. */
export function TradeHero() {
  return (
    <section className="relative overflow-hidden bg-near-black text-white" aria-labelledby="trade-h1">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] lg:block" aria-hidden="true">
        <Image src={BRAND_RENDERS.cylinderXray.src} alt="" width={BRAND_RENDERS.cylinderXray.width} height={BRAND_RENDERS.cylinderXray.height} sizes="(min-width: 1024px) 55vw, 0px" priority className="h-full w-full object-cover object-left opacity-60 [mask-image:linear-gradient(to_right,transparent,black_40%)]" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgb(218_21_25/0.16),transparent_55%)]" aria-hidden="true" />
      <div className="container-wd relative py-20 lg:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">For locksmiths, installers and door companies</p>
        <h1 id="trade-h1" className="heading-display mt-4 max-w-2xl text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
          Fit the lock you can <span className="text-red">stand behind.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/80">
          3 Star Kitemark, Sold Secure Diamond and Secured by Design on one cylinder, with a £5,000 guarantee your customer registers in two minutes. Open a trade account with Watchdog.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#apply" className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors hover:bg-red-deep">Apply for a trade account</a>
          <a href={SITE.phoneHref} className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-colors hover:border-red hover:text-red">Call {SITE.phone}</a>
        </div>
      </div>
    </section>
  );
}

/** Four reasons, facts only. */
export function TradeReasons() {
  return (
    <section className="bg-cream py-20 lg:py-28" aria-labelledby="reasons-title">
      <div className="container-wd">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">Why trade with Watchdog</p>
        <h2 id="reasons-title" className="heading-display mt-3 max-w-2xl text-3xl sm:text-4xl lg:text-5xl">One cylinder that satisfies every specifier.</h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-2">
          {TRADE.reasons.map((r, i) => (
            <li key={r.title} className="rounded-2xl bg-warm-white p-7 shadow-card">
              <p className="font-playfair text-3xl font-semibold leading-none text-red" aria-hidden="true">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="heading-display mt-4 text-xl sm:text-2xl">{r.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/80">{r.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Three steps. */
export function TradeSteps() {
  return (
    <section className="bg-white py-20 lg:py-28" aria-labelledby="steps-title">
      <div className="container-wd">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">How it works</p>
        <h2 id="steps-title" className="heading-display mt-3 text-3xl sm:text-4xl">Three steps to your first trade order.</h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {TRADE.steps.map((s, i) => (
            <li key={s.title} className="relative border-t-2 border-red pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/60">Step {i + 1}</p>
              <h3 className="heading-display mt-2 text-xl">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/80">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Closer for existing trade customers. */
export function TradeCloser() {
  return (
    <section className="bg-near-black py-16 text-white" aria-labelledby="closer-title">
      <div className="container-wd flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <h2 id="closer-title" className="heading-display text-3xl text-white sm:text-4xl">Already a trade customer?</h2>
          <p className="mt-3 text-white/75">Call the sales line or email the team and they will take your order.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={SITE.phoneHref} className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors hover:bg-red-deep">{SITE.phone}</a>
          <a href={`mailto:${SITE.email}`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-colors hover:border-red hover:text-red">{SITE.email}</a>
        </div>
      </div>
    </section>
  );
}
