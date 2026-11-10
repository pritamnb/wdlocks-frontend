import Image from 'next/image';
import Link from 'next/link';
import { ChapterLoop } from '@/components/media/ChapterLoop';
import { BRAND_RENDERS } from '@/lib/constants';

const tiles = [
  { img: BRAND_RENDERS.cylinderFront, title: 'Anti-everything.', body: 'Anti-pick, anti-bump, anti-drill, anti-snap. Eleven pins and hardened steel inserts against every common attack.' },
  { img: BRAND_RENDERS.guaranteeKeytag, title: 'Watchdog £5,000 guarantee.', body: 'Register your lock and, if a burglar snaps it and breaks in, we pay out. Free with every genuine Watchdog.' },
  { img: BRAND_RENDERS.keysEngraved, title: 'Cut to your key number.', body: 'Extra keys are cut only against the number stamped on your key, so nobody copies one at a kiosk.' },
  { img: BRAND_RENDERS.keySingle, title: 'The Watchdog key.', body: 'A dimple and snake-groove key with a thick bow stamped Watchdog Stays Locked. Three in every box.' },
  { img: BRAND_RENDERS.cylinderSide, title: 'Quick, easy installation.', body: 'Measure, undo one fixing screw, swap the cylinder. Five minutes with a screwdriver, no locksmith needed.' },
  { img: { src: '/brand/bsi-kitemark.webp', alt: 'BSI Kitemark', width: 200, height: 200 }, title: 'Every body approves.', body: 'BSI Kitemark TS 007 3 Star, Sold Secure Diamond, Secured by Design. The three marks that matter in the UK.' },
];

/** Ultion's lower product-page scroll (rock-solid core · lockdown mode · as safe as houses · protects millions) in Watchdog terms. */
export function LockFeatureSections() {
  return (
    <>
      <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-near-black text-white" aria-labelledby="alps-title">
        <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Always locked</span>
            <h2 id="alps-title" className="heading-display mt-5 text-3xl text-white sm:text-4xl">
              <span className="text-red">ALPS.</span> The cam locks the instant your key comes out.
            </h2>
            <p className="mt-4 text-white/75">
              The Always Locked Protection System is the heart of every Watchdog. Snap the outside and the sacrificial section breaks away while the cam stays locked. The door stays shut, and the eleven-pin stack behind it keeps picking and bumping out.
            </p>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
              <div><dt className="text-white/60">Pins</dt><dd className="font-playfair text-2xl font-semibold text-white">11</dd></div>
              <div><dt className="text-white/60">Key combinations</dt><dd className="font-playfair text-2xl font-semibold text-white">800,000+</dd></div>
              <div><dt className="text-white/60">Seconds exposed</dt><dd className="font-playfair text-2xl font-semibold text-white">0</dd></div>
            </dl>
          </div>
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-white/15">
              <ChapterLoop clip="alps" blend="plain" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-red text-white" aria-labelledby="snap-title">
        <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <Image src={BRAND_RENDERS.cylinderDetail.src} alt={BRAND_RENDERS.cylinderDetail.alt} width={BRAND_RENDERS.cylinderDetail.width} height={BRAND_RENDERS.cylinderDetail.height} sizes="(max-width: 1024px) 80vw, 420px" className="mx-auto h-auto w-full max-w-[420px] drop-shadow-[0_30px_40px_rgb(0_0_0/0.35)]" />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-7">
            <span className="inline-block rounded-full bg-near-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Twice the protection</span>
            <h2 id="snap-title" className="heading-display mt-5 text-3xl text-white sm:text-4xl">Anti-snap, by design.</h2>
            <p className="mt-4 text-white/90">
              Lock snapping is the burglar&rsquo;s favourite trick on uPVC and composite doors. A Watchdog gives them a sacrificial section to break and nothing behind it: the cam stays locked, the hardened steel inserts stop the drill, and the Kitemark licence engraved on the body proves it was tested to the highest 3 Star grade.
            </p>
            <Link href="#product-film-title" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-red transition-colors duration-150 hover:bg-cream">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red text-white" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
              See how it works
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="safe-title">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Security features</span>
          <h2 id="safe-title" className="heading-display mt-5 text-4xl sm:text-5xl">As safe as houses.</h2>
          <p className="mt-4 text-charcoal/80">Every Watchdog 3 Star ALPS carries the same protection, whichever size or door it fits, because nobody should feel unsafe at home.</p>
        </div>
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {tiles.map((t) => (
            <li key={t.title} className="text-center">
              <div className="relative mx-auto h-44 w-full max-w-[260px]">
                <Image src={t.img.src} alt="" fill sizes="260px" className="object-contain drop-shadow-[0_18px_24px_rgb(10_8_6/0.18)]" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-near-black">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{t.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mt-20 overflow-hidden rounded-[2rem] bg-near-black text-white" aria-labelledby="fitted-title">
        <Image src={BRAND_RENDERS.heroCylinder.src} alt="" aria-hidden="true" width={BRAND_RENDERS.heroCylinder.width} height={BRAND_RENDERS.heroCylinder.height} sizes="600px" className="pointer-events-none absolute -right-16 top-1/2 hidden w-[560px] -translate-y-1/2 opacity-80 lg:block" />
        <div className="relative p-8 sm:p-12 lg:max-w-[55%]">
          <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Get the 3 Star lock</span>
          <h2 id="fitted-title" className="heading-display mt-5 text-4xl text-white sm:text-5xl">
            Fitted by locksmiths <span className="text-red">across the UK</span>.
          </h2>
          <p className="mt-4 text-white/75">Choose your size above and it ships the same day before 3pm, with three keys and a fitting guide in the box.</p>
          <Link href="#sizing" className="mt-7 inline-flex h-12 items-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
            Choose my size
          </Link>
        </div>
      </section>
    </>
  );
}
