import Image from 'next/image';
import Link from 'next/link';
import { HOME_TRUTHS_SOURCE } from '@/lib/constants';

/**
 * Ultion's `section-home-truths`, measured 10 Nov 2026: #2a2a2a, 640 px, photo faded on the right; "Home Truths"
 * h3 in the accent colour (23 px), the figure at 360 px, the claim (56 px / 600, white) beside it, "Learn more" below.
 * Figure: 64 % of domestic burglaries happened while someone was at home, ONS CSEW year ending March 2020 (64.1 %).
 * Backdrop (client, 11 Nov): the burglar photo sits behind the figure. On desktop it fills the right 55 % and fades in
 * from the left so the red figure stays on plain dark; on phones it is full-bleed and dimmed under the text.
 */
export function HomeTruths() {
  return (
    <section className="relative overflow-hidden bg-[#2a2a2a] text-white" aria-labelledby="truths-title">
      <div className="pointer-events-none absolute inset-0 lg:left-auto lg:w-[55%]" aria-hidden="true">
        <Image src="/brand/burglar.jpg" alt="" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-[65%_15%] opacity-35 lg:opacity-85 lg:[mask-image:linear-gradient(to_right,transparent,black_42%)]" />
      </div>
      <div className="container-wd relative flex min-h-[560px] flex-col justify-center py-16 lg:min-h-[640px] lg:py-20">
        <p className="font-sans text-[23px] font-normal text-red">Home truths</p>
        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-10">
          <p className="font-sans text-[7rem] font-normal leading-[0.9] tracking-tight text-red sm:text-[11rem] lg:text-[22.5rem] lg:leading-[0.85]" aria-hidden="true">64%</p>
          <h2 id="truths-title" className="max-w-xl font-sans text-[2.25rem] font-semibold leading-[1.05] text-white drop-shadow-[0_2px_12px_rgb(0_0_0/0.6)] sm:text-[3.5rem]">
            <span className="sr-only">64% </span>of burglaries happen when someone is at home
          </h2>
        </div>
        <div className="mt-10">
          <Link href="/home-truths" className="inline-flex h-[52px] items-center rounded-lg bg-red px-7 text-lg font-semibold text-white transition-colors duration-300 hover:bg-red-deep">
            Learn more
          </Link>
        </div>
        <p className="mt-6 text-xs text-white/45">
          Source: <a href={HOME_TRUTHS_SOURCE.href} rel="noopener" target="_blank" className="underline decoration-white/30 underline-offset-2 hover:text-white">ONS Crime Survey for England and Wales</a>, domestic burglary, year ending March 2020 (64.1%).
        </p>
      </div>
    </section>
  );
}
