import Image from 'next/image';
import Link from 'next/link';
import type { ProductFeature } from '@/lib/constants';
import { BRAND_RENDERS } from '@/lib/constants';

/** Ultion's three feature tiles: eyebrow · H3 · body · image. */
export function ProductFeatureTiles({ features, fallbackImage }: { features: ReadonlyArray<ProductFeature>; fallbackImage?: string }) {
  return (
    <section className="mt-16" aria-label="Product features">
      <ul className="grid gap-6 md:grid-cols-3" role="list">
        {features.map((f) => {
          const src = f.image ?? fallbackImage;
          return (
            <li key={f.title} className="flex flex-col overflow-hidden rounded-[10px] bg-[#f0f0f0]">
              <div className="p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red">{f.eyebrow}</p>
                <h3 className="mt-3 text-xl font-semibold text-near-black">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{f.body}</p>
              </div>
              {src && (
                <div className="relative mt-auto h-44 w-full bg-near-black">
                  <Image src={src} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain p-6" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Ultion's "Front door + Back door + Mum's door + Shed door = 1 key" graphic, for the keyed-alike service. */
export function KeyedAlikeDoors() {
  const doors = ['Front door', 'Back door', 'Side door', 'Garage'];
  return (
    <section className="mt-16 rounded-[10px] bg-[#f0f0f0] p-8 sm:p-12" aria-labelledby="doors-title">
      <h2 id="doors-title" className="heading-display text-center text-3xl sm:text-4xl">
        One key for <span className="text-red">all</span> locks.
      </h2>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {doors.map((d, i) => (
          <div key={d} className="flex items-center gap-4 sm:gap-6">
            <div className="flex w-28 flex-col items-center">
              <div className="flex h-28 w-20 items-end justify-center rounded-t-[2.5rem] border-4 border-charcoal bg-warm-white pb-6">
                <span className="h-2.5 w-2.5 rounded-full bg-red" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-semibold text-near-black">{d}</p>
            </div>
            {i < doors.length - 1 && <span className="font-playfair text-3xl text-charcoal/50" aria-hidden="true">+</span>}
          </div>
        ))}
        <span className="font-playfair text-3xl text-charcoal/50" aria-hidden="true">=</span>
        <div className="flex w-32 flex-col items-center">
          <div className="relative h-28 w-24">
            <Image src={BRAND_RENDERS.keySingle.src} alt="" fill sizes="96px" className="object-contain" />
          </div>
          <p className="mt-3 text-sm font-semibold text-red">1 × Watchdog key</p>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-sm text-charcoal/80">
        Add the keyed-alike service to an order of two or more Watchdog cylinders and every lock is pinned to the same key number. Keys you already hold can be matched too.
      </p>
    </section>
  );
}

/** Dark closer (Ultion's "protects over 3 million homes" slot) without unverified figures. */
export function ProductCloser({ eyebrow, title, body, cta, href }: { eyebrow: string; title: React.ReactNode; body: string; cta: string; href: string }) {
  return (
    <section className="relative mt-16 overflow-hidden rounded-[10px] bg-near-black text-white" aria-label={eyebrow}>
      <Image src={BRAND_RENDERS.heroCylinder.src} alt="" aria-hidden="true" width={BRAND_RENDERS.heroCylinder.width} height={BRAND_RENDERS.heroCylinder.height} sizes="600px" className="pointer-events-none absolute -right-16 top-1/2 hidden w-[560px] -translate-y-1/2 opacity-80 lg:block" />
      <div className="relative p-8 sm:p-12 lg:max-w-[55%]">
        <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">{eyebrow}</span>
        <h2 className="heading-display mt-5 text-3xl text-white sm:text-5xl">{title}</h2>
        <p className="mt-4 text-white/75">{body}</p>
        <Link href={href} className="mt-7 inline-flex h-[52px] items-center rounded-lg bg-red px-7 text-lg font-semibold text-white transition-colors duration-300 hover:bg-red-deep">{cta}</Link>
      </div>
    </section>
  );
}
