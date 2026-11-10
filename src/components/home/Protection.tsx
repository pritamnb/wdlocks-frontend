import Link from 'next/link';
import { ExplodedFilm } from '@/components/home/ExplodedFilm';

/**
 * Ultion's `section-home-protection`, measured 10 Nov 2026: 680 px tall, #f0f0f0, the exploded-lock film full-bleed
 * behind everything (wider than the viewport, anchored right), and on the left only the title
 * ("The <span>very best</span> protection for British homes", 50 px / 600) and a "Learn more" button (52 px, radius 8).
 */
export function Protection() {
  return (
    <section className="relative overflow-hidden bg-[#f0f0f0]" aria-labelledby="protection-title" id="protection">
      {/* Film layer: full-bleed on desktop, a normal block on phones so the title never sits on top of it. */}
      <div className="relative lg:absolute lg:inset-y-0 lg:right-0 lg:w-[88%] lg:max-w-none">
        <ExplodedFilm className="lg:h-full lg:max-w-none [&>video]:lg:h-full [&>video]:lg:w-full [&>video]:lg:object-cover [&>video]:lg:object-left [&_img]:lg:h-full [&_img]:lg:w-full [&_img]:lg:object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#f0f0f0] via-[#f0f0f0]/70 to-transparent lg:block lg:w-[55%]" aria-hidden="true" />
      <div className="container-wd relative flex min-h-0 flex-col justify-end pb-16 pt-6 lg:min-h-[680px] lg:py-20">
        <div className="max-w-md">
          <h2 id="protection-title" className="font-sans text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-[#353535] sm:text-[3.125rem]">
            The <span className="text-red">very best</span>
            <br />
            protection for
            <br />
            British homes
          </h2>
          <Link href="#inside" className="mt-8 inline-flex h-[52px] items-center rounded-lg bg-red px-7 text-lg font-semibold text-white transition-colors duration-300 hover:bg-red-deep">
            Learn more
          </Link>
        </div>
      </div>
    </section>
  );
}
