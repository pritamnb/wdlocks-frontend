import Image from 'next/image';
import Link from 'next/link';
import { BRAND_RENDERS } from '@/lib/constants';

/** Red band (Ultion's orange "Buy more locks and keys here"). */
export function BuyBand() {
  return (
    <section className="relative overflow-hidden bg-red text-white" aria-labelledby="buy-band-title">
      <div className="container-wd grid items-center gap-8 py-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 id="buy-band-title" className="heading-display text-3xl text-white sm:text-4xl">Buy more Watchdog locks and keys here.</h2>
          <p className="mt-4 max-w-lg text-white/90">Genuine Watchdog keys cut to your key number and 3 Star ALPS cylinders in every common size, dispatched the same day before 2pm.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/products/watchdog-3-star-alps-extra-keys" className="inline-flex h-12 items-center justify-center rounded-full bg-near-black px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-charcoal">
              Buy keys here
            </Link>
            <Link href="/products/3-star-alps-cylinder-door-lock" className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white hover:text-red">
              Buy locks here
            </Link>
          </div>
        </div>
        <div className="relative hidden lg:col-span-5 lg:block">
          <Image
            src={BRAND_RENDERS.keysEngraved.src}
            alt={BRAND_RENDERS.keysEngraved.alt}
            width={BRAND_RENDERS.keysEngraved.width}
            height={BRAND_RENDERS.keysEngraved.height}
            sizes="420px"
            className="mx-auto h-auto w-[340px] -rotate-12 drop-shadow-[0_30px_40px_rgb(0_0_0/0.35)]"
          />
        </div>
      </div>
    </section>
  );
}
