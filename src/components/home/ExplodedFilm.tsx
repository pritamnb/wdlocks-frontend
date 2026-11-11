'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * Film behind the Protection headline: the Watchdog ALPS cut-away (red cam and Always Locked Protection System,
 * white background, brand-free). It plays while the block sits in the middle of the screen and pauses when it leaves,
 * so the motion is where the eye is. Reduced motion shows the poster. The white background multiply-blends away on the
 * grey panel.
 *
 * 11 Nov: replaced the "exploded lock" clip, which turned out to be Ultion's own film (engraved ULTION once enlarged).
 */
export function ExplodedFilm({ className }: { className?: string }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = React.useState(false);
  const clip = BRAND_VIDEO.clips.alps;

  React.useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;

    const onReady = () => setReady(true);
    video.addEventListener('loadeddata', onReady);
    if (video.readyState >= 2) onReady();

    const section = (wrap.closest('section') ?? wrap) as HTMLElement;
    // Fetch the clip only once the block is within a screen of the viewport, not on page load.
    const loader = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        video.preload = 'auto';
        video.load();
        loader.disconnect();
      },
      { root: null, rootMargin: '100% 0px 100% 0px', threshold: 0 },
    );
    loader.observe(section);
    // Play while any part of the block overlaps the middle 20 % of the viewport; pause otherwise.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    );
    io.observe(section);
    const onVis = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      loader.disconnect();
      video.removeEventListener('loadeddata', onReady);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced]);

  return (
    <div ref={wrapRef} className={cn('relative mx-auto w-full max-w-[760px]', className)}>
      {reduced ? (
        <Image src={clip.poster} alt={clip.alt} width={960} height={540} sizes="(min-width: 1024px) 760px, 100vw" className="w-full mix-blend-multiply" />
      ) : (
        <>
          <video
            ref={videoRef}
            src={clip.mp4}
            poster={clip.poster}
            muted
            loop
            playsInline
            preload="none"
            aria-label={clip.alt}
            className={cn('aspect-video w-full mix-blend-multiply transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
          />
          {!ready && <Image src={clip.poster} alt="" aria-hidden="true" width={960} height={540} sizes="(min-width: 1024px) 760px, 100vw" className="absolute inset-0 w-full mix-blend-multiply" />}
        </>
      )}
    </div>
  );
}
