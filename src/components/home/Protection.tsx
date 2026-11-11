import Link from 'next/link';
import { ExplodedFilm } from '@/components/home/ExplodedFilm';

/**
 * Ultion's `section-home-protection` (680 px, #f0f0f0): title + "Learn more" on the left, the exploded-lock film on the
 * right. Client, 11 Nov: the film is its own column, shown whole and aligned to the right edge of the content, never
 * cropped by the layout; on phones it stacks under the title.
 */
export function Protection() {
  return (
    <section className="bg-[#f0f0f0]" aria-labelledby="protection-title" id="protection">
      <div className="container-wd grid items-center gap-10 py-14 lg:min-h-[680px] lg:grid-cols-12 lg:gap-8 lg:py-16">
        <div className="lg:col-span-5">
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
        <div className="relative lg:col-span-7">
          <ExplodedFilm className="ml-auto w-full max-w-[640px] lg:max-w-[700px]" />
          {/* The crop's right edge cuts a coupling piece; fade it into the panel (an overlay keeps the film's multiply blend intact). */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#f0f0f0] to-transparent sm:w-24" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
