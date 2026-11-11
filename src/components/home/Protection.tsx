import Link from 'next/link';
import { ExplodedFilm } from '@/components/home/ExplodedFilm';

/**
 * Ultion's `section-home-protection`, measured 10 Nov 2026: 680 px tall, #f0f0f0, a lock film full-bleed
 * behind everything (wider than the viewport, anchored right), and on the left only the title
 * ("The <span>very best</span> protection for British homes", 50 px / 600) and a "Learn more" button (52 px, radius 8).
 */
export function Protection() {
  return (
    <section className="relative overflow-hidden bg-[#f0f0f0]" aria-labelledby="protection-title" id="protection">
      {/* Film layer: full-bleed on desktop, a normal block on phones so the title never sits on top of it. */}
      {/* The clip is scaled up on desktop so the cut-away fills the panel like Ultion's film (otherwise the panel reads as
          an empty grey void with a small lock in it). */}
      <div className="relative lg:absolute lg:inset-0 lg:w-full lg:max-w-none lg:overflow-hidden">
        <ExplodedFilm className="lg:h-full lg:max-w-none [&>video]:lg:h-full [&>video]:lg:w-full [&>video]:lg:scale-[1.35] [&>video]:lg:object-cover [&>video]:lg:[object-position:70%_50%] [&_img]:lg:h-full [&_img]:lg:w-full [&_img]:lg:scale-[1.35] [&_img]:lg:object-cover [&_img]:lg:[object-position:70%_50%]" />
      </div>
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#f0f0f0] via-[#f0f0f0]/75 to-transparent lg:block lg:w-[58%]" aria-hidden="true" />
      <div className="container-wd relative flex min-h-0 flex-col justify-end pb-16 pt-6 lg:min-h-[680px] lg:justify-center lg:py-20">
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
