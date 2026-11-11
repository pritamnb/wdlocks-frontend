'use client';

import * as React from 'react';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * 16:9 films only (client, 11 Nov): the 5:4 cuts needed a blurred fill behind them and looked cropped, so they are out.
 * Each film fills the hero edge to edge (object-cover) and plays for up to SLOT seconds before crossfading to the next.
 */
const FILMS = [
  // The explainer films are shot on white with their own captions; `dim` darkens them so the white headline stays readable.
  { src: BRAND_VIDEO.explainerInline.mp4, poster: BRAND_VIDEO.explainerInline.poster, label: 'How a Watchdog lock works', dim: true },
  { src: BRAND_VIDEO.turntable.mp4, poster: BRAND_VIDEO.turntable.poster, label: 'The cylinder', dim: false },
  { src: BRAND_VIDEO.film.mp4, poster: BRAND_VIDEO.film.poster, label: 'The Watchdog film', dim: true },
] as const;

const SLOT_SECONDS = 12;
const FADE_MS = 900;

/**
 * Carousel of films behind the hero headline: the active film plays muted; the next one is preloaded; after SLOT
 * seconds (or when a short film ends) the next crossfades in. Pauses while the hero is off screen or the tab is
 * hidden. Reduced motion shows the first poster only.
 */
const noop = () => () => {};
/** Phones and data-saver connections get the posters only: the films are 0.5–2 MB each and the hero is the LCP. */
function useFilmsAllowed() {
  return React.useSyncExternalStore(
    noop,
    () => {
      const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
      return window.matchMedia('(min-width: 768px)').matches && !nav.connection?.saveData;
    },
    () => true,
  );
}

export function HeroBackdrop() {
  const prefersReduced = usePrefersReducedMotion();
  const filmsAllowed = useFilmsAllowed();
  const reduced = prefersReduced || !filmsAllowed;
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useRef<Array<HTMLVideoElement | null>>([]);
  const [active, setActive] = React.useState(0);
  const [inView, setInView] = React.useState(true);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.2), { threshold: [0, 0.2, 0.5] });
    io.observe(el);
    const onVis = () => setInView((v) => (document.hidden ? false : v || el.getBoundingClientRect().bottom > 0));
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    const current = refs.current[active];
    const next = refs.current[(active + 1) % FILMS.length];
    refs.current.forEach((v, i) => {
      if (v && i !== active) v.pause();
    });
    if (!inView || !current) return;
    current.currentTime = 0;
    void current.play().catch(() => {});
    if (next) next.preload = 'auto';
    const advance = () => setActive((a) => (a + 1) % FILMS.length);
    const timer = setTimeout(advance, SLOT_SECONDS * 1000);
    current.addEventListener('ended', advance);
    return () => {
      clearTimeout(timer);
      current.removeEventListener('ended', advance);
    };
  }, [active, inView, reduced]);

  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden="true">
      {FILMS.map((f, i) => (
        <React.Fragment key={f.src}>
          {i === 0 && (
            // The first poster is the hero's LCP: fetch it first so the headline has its backdrop before the film plays.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.poster} alt="" fetchPriority="high" loading="eager" decoding="async" className={cn('absolute inset-0 h-full w-full object-cover', f.dim && 'brightness-[.55] contrast-[1.05]')} />
          )}
        <video
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={cn('absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out', f.dim && 'brightness-[.55] contrast-[1.05]', i === active ? 'opacity-100' : 'opacity-0')}
          style={{ transitionDuration: `${FADE_MS}ms` }}
          muted
          playsInline
          loop={false}
          preload={i === 0 ? 'auto' : 'none'}
          poster={f.poster}
          tabIndex={-1}
        >
          {!reduced && <source src={f.src} type="video/mp4" />}
        </video>
        </React.Fragment>
      ))}
      {!reduced && (
        <div className="pointer-events-auto absolute bottom-5 right-5 z-10 flex gap-1.5 sm:right-8" role="tablist" aria-label="Background film">
          {FILMS.map((f, i) => (
            <button
              key={f.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={f.label}
              onClick={() => setActive(i)}
              className={cn('h-1.5 rounded-full transition-all duration-300', i === active ? 'w-7 bg-red' : 'w-3 bg-white/40 hover:bg-white/70')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
