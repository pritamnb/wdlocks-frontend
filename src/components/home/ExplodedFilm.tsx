'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * The exploded-lock animation beside the Protection headline. One rule: as the banner reaches the centre of the screen
 * the lock explodes; as the banner moves away, up or down, it closes again. The frame is tied to the banner's
 * position (seeked, never "played"), so it works at any scroll speed and identically in every browser; the clip is
 * all-keyframe so seeking is smooth. Reduced motion shows the exploded frame as a still. White background
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

    // Fetch the clip well before the block arrives so it is ready to play the moment it is centred.
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

    /**
     * The film is driven by where the banner is: fully closed while it is far from the centre, opening as it
     * approaches, fully exploded at the centre, closing again as it moves away. The frame follows a target with a
     * capped speed (a full open or close takes about 1.2 s), so arriving at the centre and stopping still plays the
     * explosion through, and leaving plays it backwards — at any scroll speed, in every browser (seeks, not playback).
     */
    const CENTRE = 0.12; // within ±12 % of the viewport height of the centre: fully exploded
    const FAR = 0.45; // beyond ±45 %: fully closed
    const TRAVERSE_MS = 1200;
    let current = 0; // 0 = closed … 1 = exploded
    let target = 0;
    let frame = 0;
    let last = 0;
    const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2);
    const targetFor = () => {
      const r = wrap.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const offset = Math.abs(r.top + r.height / 2 - vh / 2) / vh;
      if (offset <= CENTRE) return 1;
      if (offset >= FAR) return 0;
      return 1 - (offset - CENTRE) / (FAR - CENTRE);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const maxStep = dt / TRAVERSE_MS;
      const delta = target - current;
      current += Math.max(-maxStep, Math.min(maxStep, delta));
      video.currentTime = Math.min(current * duration(), duration() - 0.02);
      if (Math.abs(target - current) > 0.0005) frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        last = 0;
      }
    };
    const update = () => {
      target = targetFor();
      if (!frame && Math.abs(target - current) > 0.0005) frame = requestAnimationFrame(tick);
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    video.addEventListener('loadedmetadata', update);
    update();

    const onVis = () => {
      if (!document.hidden) update();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      loader.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      video.removeEventListener('loadedmetadata', update);
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
