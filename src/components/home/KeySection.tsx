import Image from 'next/image';
import Link from 'next/link';
import { BRAND_RENDERS } from '@/lib/constants';

/** Ultion's "The UK's thickest key" slot: the Watchdog dimple-and-snake key on a dark panel. */
export function KeySection() {
  return (
    <section className="relative overflow-hidden bg-near-black text-white" aria-labelledby="key-title">
      <div className="container-wd grid items-center gap-10 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-6">
          <h2 id="key-title" className="heading-display text-4xl text-white sm:text-5xl">
            The Watchdog <span className="text-red">dimple</span> key.
          </h2>
          <p className="mt-5 max-w-md text-white/75">
            A dimple and snake-groove key that only cuts against your registered key number, with a thick bow stamped Watchdog Stays Locked. Three in every box; more whenever you need them.
          </p>
          <Link href="/products/watchdog-3-star-alps-extra-keys" className="mt-7 inline-flex h-12 items-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
            Buy more keys
          </Link>
        </div>
        <div className="relative lg:col-span-6">
          <Image
            src={BRAND_RENDERS.keySingle.src}
            alt={BRAND_RENDERS.keySingle.alt}
            width={BRAND_RENDERS.keySingle.width}
            height={BRAND_RENDERS.keySingle.height}
            sizes="(max-width: 1024px) 70vw, 520px"
            className="mx-auto h-auto w-[300px] rotate-[25deg] drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)] sm:w-[420px] lg:w-[520px]"
          />
        </div>
      </div>
    </section>
  );
}
