import Link from 'next/link';
import { HOME_TRUTHS, HOME_TRUTHS_SOURCE } from '@/lib/constants';

/**
 * Ultion's `section-home-truths`: dark full-bleed panel, "Home Truths" title, one giant figure with its claim, Learn more.
 * Ours uses the first sourced truth (ONS CSEW) and adds the postcode crime checker as the second call to action.
 */
export function HomeTruths() {
  const truth = HOME_TRUTHS[0];
  return (
    <section className="relative overflow-hidden bg-[#1b1a1c] py-20 text-white lg:py-28" aria-labelledby="truths-title">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_40%,rgb(218_21_25/0.2),transparent_55%)]" aria-hidden="true" />
      <div className="container-wd relative">
        <p className="heading-display text-2xl text-white/80 sm:text-3xl">Home truths</p>
        <div className="mt-8 grid items-end gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="font-playfair text-[7rem] font-semibold leading-[0.85] text-red sm:text-[10rem] lg:text-[13rem]" aria-hidden="true">{truth.stat}</p>
            <h2 id="truths-title" className="heading-display mt-4 max-w-xl text-3xl text-white sm:text-4xl lg:text-5xl">
              <span className="sr-only">{truth.stat} </span>{truth.claim}
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-3">
            <p className="max-w-md text-white/75">{truth.body}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/home-truths" className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
                Learn more
              </Link>
              <Link href="/home-truths#crime-checker" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-colors duration-150 hover:border-red hover:text-red">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                How secure is your home?
              </Link>
            </div>
            <p className="mt-5 text-xs text-white/45">
              Source: <a href={HOME_TRUTHS_SOURCE.href} rel="noopener" target="_blank" className="underline decoration-white/30 underline-offset-2 hover:text-white">ONS Crime Survey for England and Wales</a>, year ending March 2025. Check recorded crime around your own postcode on the Home truths page.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
