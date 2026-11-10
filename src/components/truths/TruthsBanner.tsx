import Image from 'next/image';
import { BRAND_RENDERS, HOME_TRUTHS_SOURCE } from '@/lib/constants';

/** Ultion's `section-hometruths-banner`: dark full-height banner, eyebrow, "Home truths" with the accent word, intro. */
export function TruthsBanner() {
  return (
    <section className="relative overflow-hidden bg-near-black text-white" aria-labelledby="truths-h1">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] lg:block" aria-hidden="true">
        <Image
          src={BRAND_RENDERS.cylinderXray.src}
          alt=""
          width={BRAND_RENDERS.cylinderXray.width}
          height={BRAND_RENDERS.cylinderXray.height}
          sizes="(min-width: 1024px) 60vw, 0px"
          priority
          className="h-full w-full object-cover object-left opacity-70 [mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_60%,rgb(218_21_25/0.16),transparent_55%)]" aria-hidden="true" />
      <div className="container-wd relative flex min-h-[calc(100svh-7rem)] flex-col justify-center py-20 lg:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">The world we live in</p>
        <h1 id="truths-h1" className="heading-display mt-4 text-[3.25rem] leading-[0.95] text-white sm:text-7xl lg:text-[6.5rem]">
          Home <span className="text-red">truths</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/80">
          Did you know that 63% of burglaries happen while someone is at home, and that 77% of burglars who get in come through a door rather
          than a window? Your door is only as strong as the cylinder in it. Uncover the facts behind British burglary, check the crime in your own
          postcode, and see why Watchdog treats the front door as the front line.
        </p>
        <p className="mt-4 text-xs text-white/50">
          Figures:{' '}
          <a href={HOME_TRUTHS_SOURCE.href} rel="noopener" target="_blank" className="underline decoration-white/30 underline-offset-2 hover:text-white">
            {HOME_TRUTHS_SOURCE.label}
          </a>
          .
        </p>
        <a href="#truths" className="mt-12 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-red hover:text-red" aria-label="Scroll to the truths">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
