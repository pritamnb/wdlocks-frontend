import Image from 'next/image';
import { BRAND_RENDERS } from '@/lib/constants';

const facts = [
  { stat: '11', unit: 'pins', body: 'Most cylinders decode the key with 5 or 6 pins. Watchdog uses 11 for 800,000+ combinations.' },
  { stat: '3★', unit: 'Kitemark TS 007', body: 'The highest BSI rating for euro cylinders. Tested for snapping, drilling, picking and bumping.' },
  { stat: '0', unit: 'seconds exposed', body: 'ALPS — Always Locked Protection System — locks the cam the instant you remove your key.' },
  { stat: '5', unit: 'minute fit', body: 'Measure, undo one screw, swap the cylinder. Three keys and a fitting guide in every box.' },
];

/** Product-fact strip in the style of Ultion's "Home Truths" — only claims the client already makes on wdlocks.co.uk. */
export function HomeTruths() {
  return (
    <section className="relative overflow-hidden border-y border-cream-dark bg-navy py-16 text-white" aria-labelledby="truths-title">
      <Image
        src={BRAND_RENDERS.cylinderFront.src}
        alt=""
        aria-hidden="true"
        width={BRAND_RENDERS.cylinderFront.width}
        height={BRAND_RENDERS.cylinderFront.height}
        sizes="260px"
        className="pointer-events-none absolute -right-6 -top-10 hidden w-[220px] rotate-[18deg] opacity-90 drop-shadow-[0_30px_40px_rgb(0_0_0/0.45)] lg:block xl:w-[260px]"
      />
      <div className="container-wd relative">
        <div className="flex flex-wrap items-end justify-between gap-6 lg:pr-56">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-grey">Home truths</p>
            <h2 id="truths-title" className="heading-display mt-3 text-3xl text-white sm:text-4xl">
              Your door is only as strong as the cylinder in it.
            </h2>
          </div>
          <p className="max-w-md text-sm text-blue-grey/90">
            A multi-point lock and a solid door mean nothing if the cylinder can be snapped in seconds. The cylinder is
            the one upgrade that changes the outcome.
          </p>
        </div>
        <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-blue-grey/20 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.unit} className="bg-navy p-6 transition-colors duration-150 hover:bg-[#2f4160]">
              <dt className="flex items-baseline gap-2">
                <span className="font-playfair text-5xl font-semibold text-white">{f.stat}</span>
                <span className="text-sm font-semibold uppercase tracking-wide text-red">{f.unit}</span>
              </dt>
              <dd className="mt-3 text-sm leading-relaxed text-blue-grey/90">{f.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
