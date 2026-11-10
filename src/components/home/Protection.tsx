import Link from 'next/link';
import { ExplodedLock } from '@/components/home/ExplodedLock';

const marks = [
  { label: 'BSI Kitemark licence', value: 'KM597142' },
  { label: 'Standard', value: 'TS 007-1:2024 · 3 Star' },
  { label: 'BS EN 1303 grading', value: '1 6 0 B 0 C 6 0' },
  { label: 'Sold Secure', value: 'SS312:2024 Diamond' },
];

/** Ultion's "The very best protection for British homes": dark panel, giant headline, Learn more, exploded lock on the right. */
export function Protection() {
  return (
    <section className="relative overflow-hidden bg-[#1b1a1c] py-20 text-white lg:py-28" aria-labelledby="protection-title" id="protection">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_50%,rgb(255_255_255/0.06),transparent_60%)]" aria-hidden="true" />
      <div className="container-wd relative grid items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="protection-title" className="heading-display text-[2.75rem] leading-[1.02] text-white sm:text-6xl lg:text-[4.25rem]">
            The <span className="text-red">very best</span>
            <br />
            protection for
            <br />
            British homes.
          </h2>
          <p className="mt-6 max-w-md text-white/70">
            Eleven pins, hardened steel inserts, a sacrificial anti-snap section and a cam that locks the moment the key comes out. Every part tested to the highest 3 Star grade.
          </p>
          <Link href="#inside" className="mt-8 inline-flex h-12 items-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
            Learn more
          </Link>
        </div>
        <div className="lg:col-span-7">
          <ExplodedLock />
          <dl className="mx-auto mt-8 grid max-w-[760px] grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-4">
            {marks.map((m) => (
              <div key={m.label}>
                <dt className="text-xs text-white/55">{m.label}</dt>
                <dd className="mt-0.5 font-mono text-[13px] font-semibold tracking-wide text-white">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
