'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

/**
 * The exploded-lock animation beside the Protection headline. As the banner reaches the centre of the screen the lock
 * explodes and then keeps looping back and forth (explode, hold, close, hold…) for as long as the banner stays there;
 * as the banner moves away, up or down, it closes. Frames are seeked from the banner's position, never "played", so
 * it works at any scroll speed and identically in every browser; the clip is all-keyframe so seeking is smooth.
 * Reduced motion shows the exploded frame as a still. White background multiply-blends away on the grey panel.
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
     * Position-driven while the banner approaches or leaves (closed far away, opening on the way in, closing on the
     * way out). While the banner is AT the centre the film loops back and forth: explode, hold, close, hold, explode…
     * Frames are seeked (never "played"), so it works at any scroll speed and identically in every browser.
     */
    const CENTRE = 0.14; // within ±14 % of the viewport height of the centre: looping
    const FAR = 0.45; // beyond ±45 %: fully closed
    const TRAVERSE_MS = 1300; // one explode or one close
    const HOLD_MS = 500; // pause at each end of the loop
    let current = 0; // 0 = closed … 1 = exploded
    let target = 0;
    let centred = false;
    let dir = 1; // loop direction while centred
    let holdUntil = 0;
    let frame = 0;
    let last = 0;
    const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2);
    const seek = () => {
      video.currentTime = Math.min(current * duration(), duration() - 0.02);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const step = dt / TRAVERSE_MS;
      if (centred) {
        if (now >= holdUntil) {
          current = Math.max(0, Math.min(1, current + dir * step));
          seek();
          if (current >= 1 || current <= 0) {
            dir = current >= 1 ? -1 : 1;
            holdUntil = now + HOLD_MS;
          }
        }
        frame = requestAnimationFrame(tick); // keep looping while centred
        return;
      }
      const delta = target - current;
      current += Math.max(-step, Math.min(step, delta));
      seek();
      if (Math.abs(target - current) > 0.0005) frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        last = 0;
      }
    };
    const update = () => {
      const r = wrap.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const offset = Math.abs(r.top + r.height / 2 - vh / 2) / vh;
      const wasCentred = centred;
      centred = offset <= CENTRE;
      if (centred && !wasCentred) {
        dir = 1; // arriving: explode first
        holdUntil = 0;
      }
      target = offset >= FAR ? 0 : offset <= CENTRE ? 1 : 1 - (offset - CENTRE) / (FAR - CENTRE);
      if (!frame && (centred || Math.abs(target - current) > 0.0005)) frame = requestAnimationFrame(tick);
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
