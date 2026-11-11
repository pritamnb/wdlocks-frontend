'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * The exploded-lock animation beside the Protection headline. While the block sits in the middle of the screen it plays
 * back and forth: forward to the exploded frame, a short hold, then frame-stepped backwards to the closed lock, and
 * again. When the block leaves the middle it closes back up and waits. Browsers cannot play video backwards, so the
 * reverse pass seeks frame by frame (the clip is all-keyframe, which keeps that smooth). Reduced motion shows the
 * exploded frame as a still. The white background multiply-blends away on the grey panel.
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
    const loader = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        video.preload = 'auto';
        video.load();
        loader.disconnect();
      },
      { root: null, rootMargin: '250% 0px 250% 0px', threshold: 0 },
    );
    loader.observe(section);

    const REVERSE_SECONDS = 1.6; // full-length reverse pass
    const HOLD_MS = 700; // pause on the exploded frame before closing, and on the closed lock before exploding again
    let centred = false;
    let frame = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const clearTimers = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = undefined;
    };
    const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2);

    const playForward = () => {
      clearTimers();
      void video.play().catch(() => {});
    };
    /** Steps backwards from the current frame to 0, then (if still centred) explodes again. */
    const reverse = (thenReplay: boolean) => {
      clearTimers();
      video.pause();
      const from = video.currentTime;
      if (from <= 0.02) {
        if (thenReplay && centred) holdTimer = setTimeout(playForward, HOLD_MS);
        return;
      }
      const total = (from / duration()) * REVERSE_SECONDS * 1000;
      const started = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - started) / total);
        const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out
        video.currentTime = from * (1 - eased);
        if (k < 1) frame = requestAnimationFrame(step);
        else {
          frame = 0;
          video.currentTime = 0;
          if (thenReplay && centred) holdTimer = setTimeout(playForward, HOLD_MS);
        }
      };
      frame = requestAnimationFrame(step);
    };
    const onEnded = () => {
      if (centred) holdTimer = setTimeout(() => reverse(true), HOLD_MS);
    };
    video.addEventListener('ended', onEnded);

    const io = new IntersectionObserver(
      ([entry]) => {
        centred = entry.isIntersecting;
        if (centred) playForward();
        else reverse(false);
      },
      // Fires when any part of the section overlaps the middle 20 % of the viewport.
      { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    );
    io.observe(section);
    const onVis = () => {
      if (document.hidden) {
        clearTimers();
        video.pause();
      } else if (centred) playForward();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      loader.disconnect();
      clearTimers();
      video.removeEventListener('ended', onEnded);
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
            preload="metadata"
            aria-label={clip.alt}
            className={cn('aspect-[1200/800] w-full mix-blend-multiply transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
          />
          {!ready && <Image src={clip.poster} alt="" aria-hidden="true" width={clip.width} height={clip.height} sizes="(min-width: 1024px) 760px, 100vw" className="absolute inset-0 w-full mix-blend-multiply" />}
        </>
      )}
    </div>
  );
}
