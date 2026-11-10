import Image from 'next/image';
import { BRAND_RENDERS, GUARANTEE } from '@/lib/constants';

/** Ultion's "Register your £5,000 guarantee" on a dark panel with the key tag. */
export function Guarantee() {
  return (
    <section className="relative overflow-hidden bg-near-black text-white" aria-labelledby="guarantee-title" id="guarantee">
      <div className="container-wd grid items-center gap-10 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-7">
          <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Protected by Watchdog</span>
          <h2 id="guarantee-title" className="heading-display mt-5 text-4xl text-white sm:text-5xl">
            Register your <span className="text-red">{GUARANTEE.amountLabel}</span> guarantee.
          </h2>
          <p className="mt-5 max-w-lg text-white/75">{GUARANTEE.blurb} Register your key number at the same time and nobody can have a key cut to it without your say-so.</p>
          <a href={GUARANTEE.registerUrl} rel="noopener" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
            Activate {GUARANTEE.amountLabel} guarantee <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="relative lg:col-span-5">
          <Image
            src={BRAND_RENDERS.guaranteeKeytag.src}
            alt={BRAND_RENDERS.guaranteeKeytag.alt}
            width={BRAND_RENDERS.guaranteeKeytag.width}
            height={BRAND_RENDERS.guaranteeKeytag.height}
            sizes="(max-width: 1024px) 60vw, 360px"
            className="mx-auto h-auto w-[260px] -rotate-6 drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)] sm:w-[320px] lg:w-[360px]"
          />
        </div>
      </div>
    </section>
  );
}
