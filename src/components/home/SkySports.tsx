'use client';

import * as React from 'react';
import Image from 'next/image';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';

/** The Watchdog TV advert ("The Tale", 30 s) as shown on Sky Sports — the client's YouTube upload. */
const YOUTUBE_ID = 'z7YV2BYb5Ps';
const TITLE = 'Watchdog Locksmiths TV advert, as seen on Sky Sports';

/**
 * "How we protect you" (client, 11 Nov, mirroring the block of the same name on wdlocks.co.uk): the Sky Sports
 * advert, autoplaying muted once the block scrolls into view. The YouTube player is only loaded then (it is ~0.5 MB
 * of script), via the privacy-enhanced domain; until then the poster sits in its place so nothing shifts.
 */
export function SkySports() {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [load, setLoad] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const params = new URLSearchParams({
    autoplay: reduced ? '0' : '1',
    mute: '1',
    loop: '1',
    playlist: YOUTUBE_ID,
    playsinline: '1',
    controls: '1',
    rel: '0',
    modestbranding: '1',
  });

  return (
    <section className="bg-white py-16 lg:py-24" aria-labelledby="sky-sports-title">
      <div className="container-wd">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="sky-sports-title" className="heading-display text-3xl sm:text-4xl lg:text-5xl">How we protect you</h2>
          <p className="mt-6 flex items-center justify-center gap-4 text-sm font-semibold uppercase tracking-[0.16em] text-charcoal/70 sm:text-base">
            As seen on
            <Image src="/brand/as-seen-on-sky-sports.png" alt="Sky Sports" width={300} height={171} sizes="220px" className="h-14 w-auto sm:h-[72px]" />
          </p>
        </div>
        <div ref={ref} className="relative mx-auto mt-10 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-near-black shadow-card">
          {load ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?${params.toString()}`}
              title={TITLE}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <Image src="/brand/sky-sports-poster.jpg" alt={TITLE} fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}
