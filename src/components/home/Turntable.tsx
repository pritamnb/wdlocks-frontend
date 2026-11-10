'use client';

import * as React from 'react';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { BRAND_VIDEO } from '@/lib/constants';
import { useInViewPlayback, usePrefersReducedMotion } from '@/hooks/useInViewPlayback';

const marks = [
  { label: 'BSI Kitemark licence', value: 'KM597142' },
  { label: 'Standard', value: 'TS 007-1:2024 · 3 Star' },
  { label: 'BS EN 1303 grading', value: '1 6 0 B 0 C 6 0' },
  { label: 'Sold Secure', value: 'SS312:2024 Diamond' },
];

/**
 * Allegion's 10-second turntable render of the Watchdog cylinder. The clip has a solid black
 * background, so it sits on a near-black panel and the video edges vanish. It only loads and
 * plays while on screen, stays silent, and falls back to the poster when the visitor prefers
 * reduced motion.
 */
export function Turntable() {
  const ref = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  useInViewPlayback(ref, !reduced, 0.5);

  return (
    <section className="bg-near-black py-20 text-white" aria-labelledby="turntable-title" id="protection">
      <div className="container-wd grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Every angle. Every mark.</p>
          <h2 id="turntable-title" className="heading-display mt-3 text-4xl text-white sm:text-5xl">
            The <span className="text-red">very best</span> protection for British homes.
          </h2>
          <p className="mt-4 text-white/75">
            Turn a Watchdog over and the proof is cut into the body: the Kitemark licence number, the TS 007 3-star
            grade and the Sold Secure Diamond number. Anyone can check them.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6 text-sm">
            {marks.map((m) => (
              <div key={m.label}>
                <dt className="text-white/60">{m.label}</dt>
                <dd className="mt-0.5 font-mono text-[15px] font-semibold tracking-wide text-white">{m.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8">
            <ButtonLink href="/products/3-star-alps-cylinder-door-lock" size="lg">
              Get a Watchdog lock
            </ButtonLink>
          </div>
        </div>
        <div className="relative lg:col-span-7">
          <div className="relative mx-auto aspect-video w-full max-w-[760px] overflow-hidden rounded-[2rem]">
            {reduced ? (
              <Image src={BRAND_VIDEO.turntable.poster} alt={BRAND_VIDEO.turntable.alt} fill sizes="(max-width: 1024px) 100vw, 760px" className="object-cover" />
            ) : (
              <video
                ref={ref}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                preload="none"
                poster={BRAND_VIDEO.turntable.poster}
                aria-label={BRAND_VIDEO.turntable.alt}
              >
                <source src={BRAND_VIDEO.turntable.mp4} type="video/mp4" />
              </video>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_0_80px_40px_rgb(10_8_6)]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-center text-xs text-white/50">3D render supplied by the manufacturer. Finish shown: satin nickel.</p>
        </div>
      </div>
    </section>
  );
}
