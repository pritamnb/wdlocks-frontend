import Image from 'next/image';
import Link from 'next/link';
import { BRAND_RENDERS } from '@/lib/constants';

const facts = [
  { stat: '11', unit: 'pins', body: '800,000+ key combinations. Most cylinders use 5 or 6.' },
  { stat: '0', unit: 'seconds exposed', body: 'ALPS locks the cam the instant you remove your key.' },
  { stat: '5', unit: 'minute fit', body: 'One screw, one cylinder, three keys in the box.' },
];

/** Ultion's "Home Truths" pattern: one giant, defensible figure on a dark full-bleed panel, then the supporting facts. */
export function HomeTruths() {
  return (
    <section className="relative overflow-hidden bg-near-black py-20 text-white lg:py-28" aria-labelledby="truths-title">
      <Image
        src={BRAND_RENDERS.cylinderFront.src}
        alt=""
        aria-hidden="true"
        width={BRAND_RENDERS.cylinderFront.width}
        height={BRAND_RENDERS.cylinderFront.height}
        sizes="420px"
        className="pointer-events-none absolute -right-10 top-1/2 hidden w-[380px] -translate-y-1/2 rotate-[14deg] opacity-80 drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)] lg:block xl:w-[440px]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgb(218_21_25/0.18),transparent_55%)]" aria-hidden="true" />
      <div className="container-wd relative">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red">Home truths</p>
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
          <p className="font-playfair text-[7rem] font-semibold leading-[0.85] text-red sm:text-[10rem] lg:text-[12rem]" aria-hidden="true">3★</p>
          <h2 id="truths-title" className="heading-display max-w-xl text-3xl text-white sm:text-4xl lg:pb-4">
            <span className="sr-only">3 star: </span>the highest Kitemark rating a euro cylinder can hold. Your door is only as strong as the cylinder in it.
          </h2>
        </div>
        <Link href="/home-truths" className="mt-8 inline-flex h-12 items-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
          Learn more
        </Link>
        <dl className="mt-14 grid max-w-3xl gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.unit}>
              <dt className="flex items-baseline gap-2">
                <span className="font-playfair text-4xl font-semibold text-white">{f.stat}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-red">{f.unit}</span>
              </dt>
              <dd className="mt-2 text-sm text-white/70">{f.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
