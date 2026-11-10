'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * Ultion's scroll-driven exploded lock, now with the real Watchdog animation (2 s, all-keyframe encode).
 * The video is scrubbed by scroll position: assembled as the section enters from below, fully exploded
 * by the time it reaches the upper part of the viewport, and it reassembles when you scroll back up.
 * Reduced motion shows the exploded frame as a still. The clip's white background multiply-blends away
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

    let frame = 0;
    let lastTime = -1;
    const update = () => {
      frame = 0;
      // Progress runs from the moment the section enters at the bottom of the viewport to the moment its centre
      // reaches the viewport centre, so the lock is fully apart exactly when the block is centred, then holds.
      const section = wrap.closest('section') ?? wrap;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const start = vh; // section top at the bottom edge → assembled
      const end = vh / 2 - rect.height / 2; // section centred → exploded
      const progress = Math.min(1, Math.max(0, (start - rect.top) / Math.max(1, start - end)));
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : clip.duration;
      const t = Math.min(duration - 0.04, progress * duration);
      if (Math.abs(t - lastTime) > 0.016) {
        lastTime = t;
        video.currentTime = t;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onReady = () => {
      setReady(true);
      update();
    };

    video.addEventListener('loadeddata', onReady);
    if (video.readyState >= 2) onReady();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      video.removeEventListener('loadeddata', onReady);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [reduced, clip.duration]);

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
