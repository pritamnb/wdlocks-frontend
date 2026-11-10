import Link from 'next/link';
import { ChapterLoop } from '@/components/media/ChapterLoop';

/** Ultion's "One key for all locks": the Watchdog keyed-alike service. Fallback visual until the Watchdog keys-merge clip arrives. */
export function KeyedAlikeSection() {
  return (
    <section className="cream-panel border-y border-cream-dark" aria-labelledby="keyed-title">
      <div className="container-wd grid items-center gap-10 py-20 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="keyed-title" className="heading-display text-4xl sm:text-5xl">
            One key for <span className="text-red">all</span> locks.
          </h2>
          <p className="mt-5 max-w-md text-charcoal/80">
            Secure the front, back and side doors with Watchdog cylinders made to work with one key. Add the keyed-alike service when you order and we match every lock to your number.
          </p>
          <Link href="/products/watchdog-keyed-a-like" className="mt-7 inline-flex h-12 items-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
            Learn more
          </Link>
        </div>
        <div className="lg:col-span-7">
          <ChapterLoop clip="dimpleKey" className="mx-auto max-w-[720px] rounded-[2rem]" />
        </div>
      </div>
    </section>
  );
}
