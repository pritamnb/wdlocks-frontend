'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_RENDERS, HOME_TRUTHS, HOME_TRUTHS_SOURCE } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

const SLIDE_COUNT = HOME_TRUTHS.length + 1;

/**
 * Ultion's `section-hometruths-slider`: a title slide ("THE WORLD WE LIVE IN / THE TRUTH") followed by one giant-figure
 * slide per truth. Native scroll-snap carousel with arrows, dots and keyboard support; no library.
 */
export function TruthsSlider() {
  const trackRef = React.useRef<HTMLUListElement>(null);
  const [index, setIndex] = React.useState(0);
  const reduced = usePrefersReducedMotion();

  const goTo = React.useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
      track.scrollTo({ left: next * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced],
  );

  const onScroll = React.useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  return (
    <section id="truths" className="relative bg-[#1b1a1c] text-white" aria-roledescription="carousel" aria-label="Home truths">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:ring-2 focus-visible:ring-red"
      >
        <li className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`1 of ${SLIDE_COUNT}`}>
          <div className="container-wd flex min-h-[560px] flex-col justify-center py-20 lg:min-h-[640px]">
            <p className="heading-display text-[3.4rem] uppercase leading-[0.85] tracking-tight text-red sm:text-[7rem] lg:text-[9.5rem]">
              The world
              <br />
              <span className="text-white/35">we live in</span>
            </p>
            <p className="heading-display mt-6 text-3xl uppercase tracking-[0.2em] text-white/70 sm:text-4xl">The truth</p>
          </div>
        </li>
        {HOME_TRUTHS.map((t, i) => {
          const render = BRAND_RENDERS[t.render];
          return (
            <li key={t.stat} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 2} of ${SLIDE_COUNT}`}>
              <div className="container-wd grid min-h-[560px] items-center gap-10 py-20 lg:min-h-[640px] lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="font-playfair text-[5.5rem] font-semibold leading-none text-red sm:text-[8rem] lg:text-[10rem]">{t.stat}</p>
                  <p className="mt-2 max-w-md text-xl font-semibold leading-snug text-white sm:text-2xl">{t.claim}</p>
                  <h2 className="heading-display mt-8 max-w-lg text-2xl text-white sm:text-3xl">{t.title}</h2>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">{t.body}</p>
                  <p className="mt-5 max-w-lg text-xs text-white/45">
                    Source: <a href={HOME_TRUTHS_SOURCE.href} rel="noopener" target="_blank" className="underline decoration-white/30 underline-offset-2 hover:text-white">ONS CSEW</a>, {t.source}
                  </p>
                </div>
                <div className="relative mx-auto hidden w-full max-w-md lg:block">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(218_21_25/0.22),transparent_65%)]" aria-hidden="true" />
                  <Image src={render.src} alt="" width={render.width} height={render.height} sizes="(min-width: 1024px) 420px, 0px" className="relative mx-auto max-h-[420px] w-auto object-contain drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)]" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="container-wd flex items-center justify-between pb-10 lg:absolute lg:inset-x-0 lg:bottom-10 lg:pb-0">
        <div className="flex gap-2" role="tablist" aria-label="Choose a slide">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={index === i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn('h-2.5 rounded-full transition-all duration-200', index === i ? 'w-8 bg-red' : 'w-2.5 bg-white/30 hover:bg-white/60')}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous truth" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-red hover:text-red disabled:opacity-30 disabled:hover:border-white/25 disabled:hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" onClick={() => goTo(index + 1)} disabled={index === SLIDE_COUNT - 1} aria-label="Next truth" className="flex h-11 w-11 items-center justify-center rounded-full bg-red text-white transition-colors hover:bg-red-deep disabled:opacity-30 disabled:hover:bg-red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
