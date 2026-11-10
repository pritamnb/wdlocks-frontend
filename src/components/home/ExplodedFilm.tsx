'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * The real Watchdog exploded-lock animation (2 s). It plays once the Protection block reaches the middle of the
 * screen (client choice, 10 Nov), holds on the exploded frame, and resets when the block leaves so it plays again
 * on the next pass. Reduced motion shows the exploded frame as a still. The clip's white background multiply-blends away
 * on the cream panel, like the chapter clips.
 */
export function ExplodedFilm({ className }: { className?: string }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = React.useState(false);
  const clip = BRAND_VIDEO.exploded;

  React.useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;

    const onReady = () => setReady(true);
    video.addEventListener('loadeddata', onReady);
    if (video.readyState >= 2) onReady();

    // Play the 2 s explosion once the block's centre band crosses the middle of the screen; reset when it leaves so
    // it explodes again on the next pass. A thin root margin around the viewport centre is what "in the middle" means.
    const section = (wrap.closest('section') ?? wrap) as HTMLElement;
    let played = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!played) {
            played = true;
            video.currentTime = 0;
            void video.play().catch(() => {});
          }
        } else if (played) {
          played = false;
          video.pause();
          video.currentTime = 0;
        }
      },
      // Fires when any part of the section overlaps the middle 20% of the viewport.
      { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    );
    io.observe(section);
    const onVis = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      video.removeEventListener('loadeddata', onReady);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced]);

  return (
    <div ref={wrapRef} className={cn('relative mx-auto w-full max-w-[760px]', className)}>
      {reduced ? (
        <Image src={clip.endPoster} alt={clip.alt} width={1280} height={720} sizes="(min-width: 1024px) 760px, 100vw" className="w-full mix-blend-multiply" />
      ) : (
        <>
          <video
            ref={videoRef}
            src={clip.mp4}
            poster={clip.poster}
            muted
            playsInline
            preload="auto"
            aria-label={clip.alt}
            className={cn('aspect-video w-full mix-blend-multiply transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
          />
          {!ready && <Image src={clip.poster} alt="" aria-hidden="true" width={1280} height={720} sizes="(min-width: 1024px) 760px, 100vw" className="absolute inset-0 w-full mix-blend-multiply" />}
        </>
      )}
    </div>
  );
}
