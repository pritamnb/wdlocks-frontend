import Image from 'next/image';
import { BRAND_RENDERS, GUARANTEE } from '@/lib/constants';

/**
 * Ultion's "Register your £5,000 guarantee" on a dark panel with the pair of key tags (Pritam, 14 Nov: replaces the single
 * red tag). The tags are a transparent cut-out on the panel itself; the black half of the guarantee tag is about the
 * panel's colour, so a soft spotlight behind the pair lets its outline read as a darker shape against the glow.
 */
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
          <a href={GUARANTEE.href} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
            Activate {GUARANTEE.amountLabel} guarantee
          </a>
        </div>
        <div className="relative lg:col-span-5">
          <div className="relative mx-auto w-[290px] sm:w-[340px] lg:w-[420px]">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),rgb(255_255_255/0.05)_55%,transparent)]" />
            <Image
              src={BRAND_RENDERS.guaranteeKeytags.src}
              alt={BRAND_RENDERS.guaranteeKeytags.alt}
              width={BRAND_RENDERS.guaranteeKeytags.width}
              height={BRAND_RENDERS.guaranteeKeytags.height}
              sizes="(max-width: 640px) 290px, (max-width: 1024px) 340px, 420px"
              quality={85}
              className="relative h-auto w-full drop-shadow-[0_28px_36px_rgb(0_0_0/0.55)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
