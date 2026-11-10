import Image from 'next/image';
import Link from 'next/link';
import { BRAND_RENDERS } from '@/lib/constants';

/** Ultion's keys-page scroll ("The Real Deal" · "Key Protection with Key Control") in Watchdog terms. */
export function KeysFeatureSections() {
  return (
    <>
      <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-near-black text-white" aria-labelledby="genuine-title">
        <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Genuine keys</span>
            <h2 id="genuine-title" className="heading-display mt-5 text-3xl text-white sm:text-4xl">
              The real deal. <span className="text-red">Precision-cut</span> keys from Watchdog.
            </h2>
            <p className="mt-4 text-white/75">
              Copies cut on a high-street machine are not held to the tolerances a dimple and snake-groove key needs. They wear the pins, can jam the lock, and a non-genuine key invalidates your guarantee. Ordering here against your key number is the only way to be sure.
            </p>
          </div>
          <div className="lg:col-span-6">
            <Image src={BRAND_RENDERS.keySingle.src} alt={BRAND_RENDERS.keySingle.alt} width={BRAND_RENDERS.keySingle.width} height={BRAND_RENDERS.keySingle.height} sizes="(max-width: 1024px) 60vw, 420px" className="mx-auto h-auto w-[260px] rotate-[20deg] drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)] sm:w-[340px]" />
          </div>
        </div>
      </section>

      <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-cream-dark cream-panel" aria-labelledby="keycontrol-title">
        <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <Image src={BRAND_RENDERS.keysEngraved.src} alt={BRAND_RENDERS.keysEngraved.alt} width={BRAND_RENDERS.keysEngraved.width} height={BRAND_RENDERS.keysEngraved.height} sizes="(max-width: 1024px) 70vw, 380px" className="mx-auto h-auto w-[260px] -rotate-6 drop-shadow-[0_24px_30px_rgb(10_8_6/0.25)] sm:w-[340px]" />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-7">
            <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Secure access</span>
            <h2 id="keycontrol-title" className="heading-display mt-5 text-3xl sm:text-4xl">Key protection by <span className="text-red">key number</span>.</h2>
            <p className="mt-4 text-charcoal/80">
              Every Watchdog key carries a unique number, and extra keys are cut only against that number by us. Register your lock and the same number activates your £5,000 guarantee. Nobody can walk into a kiosk and copy your key.
            </p>
            <Link href="/#inside" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-near-black px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-near-black" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
              How it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
