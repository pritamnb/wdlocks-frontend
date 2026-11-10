'use client';

import * as React from 'react';
import { useInViewPlayback, usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

export interface FilmChapter {
  t: number;
  label: string;
  title: string;
}

interface InlineFilmProps {
  src: string;
  poster: string;
  ariaLabel: string;
  chapters: ReadonlyArray<FilmChapter>;
  /** Heading block rendered above the chapter list. */
  heading: React.ReactNode;
  /** Small line under the video. */
  caption?: string;
  /** 'dark' for near-black panels; 'light' for the cream canvas (white-background footage is multiply-blended). */
  tone?: 'dark' | 'light';
  aspectClass?: string;
  /** Put the video on the right (default) or the left on large screens. */
  mediaSide?: 'left' | 'right';
  chaptersLabel?: string;
}

/**
 * Inline film with chapters: plays muted while on screen (captions are baked into the footage),
 * sound on request, and a chapter list that seeks to each callout. Used instead of a modal.
 */
export function InlineFilm({ src, poster, ariaLabel, chapters, heading, caption, tone = 'dark', aspectClass = 'aspect-video', mediaSide = 'left', chaptersLabel = 'Film chapters' }: InlineFilmProps) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const [muted, setMuted] = React.useState(true);
  const [time, setTime] = React.useState(0);
  useInViewPlayback(ref, !reduced, 0.5);

  const activeIndex = chapters.reduce((acc, c, i) => (time >= c.t ? i : acc), 0);
  const dark = tone === 'dark';

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

  const media = (
    <div className={cn('relative lg:col-span-7', mediaSide === 'right' && 'lg:order-2')}>
      <div className={cn('relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[2rem]', aspectClass, dark ? 'bg-black' : '')}>
        <video
          ref={ref}
          className={cn('h-full w-full object-cover', !dark && 'mix-blend-multiply')}
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
          aria-label={ariaLabel}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        >
          <source src={src} type="video/mp4" />
        </video>
        {dark && <div className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_0_60px_30px_rgb(10_8_6)]" aria-hidden="true" />}
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={!muted}
          className={cn(
            'absolute bottom-4 right-4 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium backdrop-blur transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red',
            dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-near-black/85 text-white hover:bg-near-black',
          )}
        >
          <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
          {muted ? 'Sound on' : 'Mute'}
        </button>
      </div>
      {caption && <p className={cn('mt-3 text-center text-xs', dark ? 'text-white/50' : 'text-charcoal/60')}>{caption}</p>}
    </div>
  );

  const text = (
    <div className={cn('lg:col-span-5', mediaSide === 'right' && 'lg:order-1')}>
      {heading}
      <ol className="mt-8 space-y-1" aria-label={chaptersLabel}>
        {chapters.map((c, i) => {
          const active = i === activeIndex;
          return (
            <li key={c.t}>
              <button
                type="button"
                onClick={() => seek(c.t)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red',
                  dark ? 'hover:bg-white/10' : 'hover:bg-warm-white',
                  active && (dark ? 'bg-white/10' : 'bg-warm-white shadow-sm ring-1 ring-cream-dark'),
                )}
              >
                <span className={cn('w-10 shrink-0 font-mono text-xs tabular-nums', active ? 'text-red' : dark ? 'text-white/50' : 'text-charcoal/50')}>{c.label}</span>
                <span className={cn('text-[15px] font-medium', active ? (dark ? 'text-white' : 'text-near-black') : dark ? 'text-white/80' : 'text-charcoal/85')}>{c.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      {media}
      {text}
    </div>
  );
}
