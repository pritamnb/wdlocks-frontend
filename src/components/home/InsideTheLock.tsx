'use client';

import * as React from 'react';
import { BRAND_VIDEO } from '@/lib/constants';
import { useInViewPlayback, usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

const film = BRAND_VIDEO.insideFilm;

/**
 * The manufacturer's 38 s macro journey through the cylinder, played inline on the dark panel:
 * muted while it scrolls into view (the captions are baked into the footage), sound on request,
 * and a chapter list that seeks to each callout. No modal — the film is dark, so it sits naturally
 * on the near-black section instead of being boxed into a lightbox.
 */
export function InsideTheLock() {
  const ref = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const [muted, setMuted] = React.useState(true);
  const [time, setTime] = React.useState(0);
  useInViewPlayback(ref, !reduced, 0.35);

  const chapters = film.chapterList;
  const activeIndex = chapters.reduce((acc, c, i) => (time >= c.t ? i : acc), 0);

  const seek = (t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    void v.play().catch(() => undefined);
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) void v.play().catch(() => undefined);
  };

  return (
    <section className="border-t border-white/10 bg-near-black py-20 text-white" aria-labelledby="inside-title">
      <div className="container-wd grid items-center gap-10 lg:grid-cols-12">
        <div className="relative lg:col-span-7">
          <div className="relative mx-auto aspect-[5/4] w-full max-w-[760px] overflow-hidden rounded-[2rem] bg-black">
            <video
              ref={ref}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
              preload="none"
              poster={film.poster}
              aria-label={film.title}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            >
              <source src={film.mp4} type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_0_60px_30px_rgb(10_8_6)]" aria-hidden="true" />
            <button
              type="button"
              onClick={toggleMute}
              className="absolute bottom-4 right-4 inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium text-white backdrop-blur transition-colors duration-150 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
              aria-pressed={!muted}
            >
              <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
              {muted ? 'Sound on' : 'Mute'}
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-white/50">Manufacturer film · {film.durationLabel} · plays silently until you turn the sound on.</p>
        </div>

        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Inside the lock</p>
          <h2 id="inside-title" className="heading-display mt-3 text-3xl text-white sm:text-4xl">
            A camera journey through a Watchdog.
          </h2>
          <p className="mt-4 text-white/75">
            Follow the key into the cylinder and past every layer that stops a burglar. Pick a chapter to jump straight to it.
          </p>
          <ol className="mt-8 space-y-1" aria-label="Film chapters">
            {chapters.map((c, i) => (
              <li key={c.t}>
                <button
                  type="button"
                  onClick={() => seek(c.t)}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  className={cn(
                    'group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red',
                    i === activeIndex && 'bg-white/10',
                  )}
                >
                  <span className={cn('w-10 shrink-0 font-mono text-xs tabular-nums', i === activeIndex ? 'text-red' : 'text-white/50')}>{c.label}</span>
                  <span className={cn('text-[15px] font-medium', i === activeIndex ? 'text-white' : 'text-white/80')}>{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
