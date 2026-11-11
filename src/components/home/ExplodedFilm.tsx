'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * The exploded-lock animation behind the Protection headline (brand-free crop, see BRAND_VIDEO.explodedCrop). It plays
 * once when the block reaches the middle of the screen, holds on the exploded frame, and reassembles in reverse when
 * the block leaves so it plays again next time (browsers cannot play video backwards; the all-keyframe encode makes
 * frame-by-frame seeking smooth). Reduced motion shows the exploded frame as a still. The white background
 * multiply-blends away on the grey panel.
 */
export function ExplodedFilm({ className }: { className?: string }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = React.useState(false);
  const clip = BRAND_VIDEO.explodedCrop;

  React.useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;

    const onReady = () => setReady(true);
    video.addEventListener('loadeddata', onReady);
    if (video.readyState >= 2) onReady();

    const section = (wrap.closest('section') ?? wrap) as HTMLElement;
    // Fetch the clip only once the block is within a screen of the viewport.
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

    const REVERSE_SECONDS = 1.0;
    let reverseFrame = 0;
    const stopReverse = () => {
      if (reverseFrame) cancelAnimationFrame(reverseFrame);
      reverseFrame = 0;
    };
    const reverse = () => {
      stopReverse();
      video.pause();
      const from = video.currentTime;
      if (from <= 0.02) return;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1.0;
      const total = (from / duration) * REVERSE_SECONDS * 1000; // proportional: a half-exploded lock closes faster
      const started = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - started) / total);
        const eased = 1 - Math.pow(1 - k, 2);
        video.currentTime = from * (1 - eased);
        if (k < 1) reverseFrame = requestAnimationFrame(step);
        else {
          reverseFrame = 0;
          video.currentTime = 0;
        }
      };
      reverseFrame = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          stopReverse();
          void video.play().catch(() => {});
        } else {
          reverse();
        }
      },
      // Fires when any part of the section overlaps the middle 20 % of the viewport.
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
      stopReverse();
      video.removeEventListener('loadeddata', onReady);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced]);

  return (
    <div ref={wrapRef} className={cn('relative mx-auto w-full max-w-[760px]', className)}>
      {reduced ? (
        <Image src={clip.endPoster} alt={clip.alt} width={clip.width} height={clip.height} sizes="(min-width: 1024px) 760px, 100vw" className="w-full mix-blend-multiply" />
      ) : (
        <>
          <video
            ref={videoRef}
            src={clip.mp4}
            poster={clip.poster}
            muted
            playsInline
            preload="none"
            aria-label={clip.alt}
            className={cn('aspect-[776/592] w-full mix-blend-multiply transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
          />
          {!ready && <Image src={clip.poster} alt="" aria-hidden="true" width={clip.width} height={clip.height} sizes="(min-width: 1024px) 760px, 100vw" className="absolute inset-0 w-full mix-blend-multiply" />}
        </>
      )}
    </div>
  );
}
