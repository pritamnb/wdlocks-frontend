'use client';

import * as React from 'react';
import Image from 'next/image';
import { VIDEO_BAR } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

const MAX_SLOT_SECONDS = 20;
const FADE_MS = 700;

/**
 * "See Watchdog in action" (client, 11 Nov): an autoplaying carousel rather than a row of cards with a "Watch full
 * video" button. One 16:9 stage plays each film muted in turn (crossfading when a film ends or after MAX_SLOT seconds),
 * with the other films as thumbnails below. It only plays while on screen and the tab is visible; reduced motion shows
 * the posters and lets the visitor step through by hand.
 */
export function VideoBar() {
  const reduced = usePrefersReducedMotion();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useRef<Array<HTMLVideoElement | null>>([]);
  const [active, setActive] = React.useState(0);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.35), { threshold: [0, 0.35, 0.6] });
    io.observe(el);
    const onVis = () => {
      if (document.hidden) setInView(false);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    const current = refs.current[active];
    const next = refs.current[(active + 1) % VIDEO_BAR.length];
    refs.current.forEach((v, i) => {
      if (v && i !== active) v.pause();
    });
    if (!inView || !current) return;
    current.currentTime = 0;
    void current.play().catch(() => {});
    if (next) next.preload = 'auto';
    const advance = () => setActive((a) => (a + 1) % VIDEO_BAR.length);
    const timer = setTimeout(advance, MAX_SLOT_SECONDS * 1000);
    current.addEventListener('ended', advance);
    return () => {
      clearTimeout(timer);
      current.removeEventListener('ended', advance);
    };
  }, [active, inView, reduced]);

  const go = (i: number) => setActive(((i % VIDEO_BAR.length) + VIDEO_BAR.length) % VIDEO_BAR.length);
  const film = VIDEO_BAR[active];

  return (
    <section className="border-b border-cream-dark bg-white py-16 lg:py-20" aria-labelledby="in-action-title">
      <div className="container-wd">
        <h2 id="in-action-title" className="heading-display text-center text-3xl sm:text-4xl">
          See <span className="text-red">Watchdog</span> in action
        </h2>

        <div ref={wrapRef} className="relative mt-10 overflow-hidden rounded-2xl bg-near-black shadow-card" role="region" aria-roledescription="carousel" aria-label="Watchdog films">
          <div className="relative aspect-video w-full">
            {VIDEO_BAR.map((v, i) => (
              <video
                key={v.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={cn('absolute inset-0 h-full w-full object-contain transition-opacity ease-in-out', i === active ? 'opacity-100' : 'opacity-0')}
                style={{ transitionDuration: `${FADE_MS}ms` }}
                muted
                playsInline
                preload={i === 0 ? 'metadata' : 'none'}
                poster={v.poster}
                aria-hidden={i !== active}
                aria-label={v.title}
                tabIndex={-1}
              >
                {!reduced && <source src={v.mp4} type="video/mp4" />}
              </video>
            ))}
            {reduced && <Image src={film.poster} alt={film.title} fill sizes="(min-width: 1280px) 1216px, 100vw" className="object-contain" />}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-near-black/80 to-transparent px-4 pb-3 pt-10 text-white sm:px-7 sm:pb-4 sm:pt-16" aria-live="polite">
              <p className="text-[15px] font-semibold sm:text-lg">{film.title}</p>
              <p className="mt-0.5 hidden line-clamp-2 max-w-2xl text-xs text-white/70 sm:block sm:text-sm">{film.blurb}</p>
            </div>

            <button type="button" onClick={() => go(active - 1)} aria-label="Previous film" className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-red sm:left-5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" onClick={() => go(active + 1)} aria-label="Next film" className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-red sm:right-5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>

        <ul className="mt-4 grid grid-cols-4 gap-2 sm:gap-4" role="tablist" aria-label="Choose a film">
          {VIDEO_BAR.map((v, i) => (
            <li key={v.id}>
              <button
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => go(i)}
                className={cn(
                  'group block w-full overflow-hidden rounded-xl bg-near-black text-left ring-2 transition-[box-shadow,transform] duration-200',
                  i === active ? 'ring-red' : 'ring-transparent hover:ring-black/20',
                )}
              >
                <span className="relative block aspect-video w-full">
                  <Image src={v.poster} alt="" fill sizes="(min-width: 1280px) 300px, 25vw" className={cn('object-cover transition-opacity duration-300', i === active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')} />
                  <span className="absolute bottom-1.5 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">{v.durationLabel.replace(/^0/, '')}</span>
                </span>
                <span className="hidden truncate px-2.5 py-2 text-[13px] font-medium text-charcoal sm:block">{v.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
