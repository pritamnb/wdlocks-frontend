'use client';

import * as React from 'react';

/** Reduced-motion preference, false until mounted so server and client render the same markup. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Plays a muted <video> only while it is on screen. The element should start with
 * preload="none"; we switch to "auto" on first intersection so nothing downloads for sections
 * the visitor never reaches.
 */
export function useInViewPlayback(ref: React.RefObject<HTMLVideoElement | null>, enabled = true, threshold = 0.25) {
  React.useEffect(() => {
    const video = ref.current;
    if (!video || !enabled) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.preload === 'none') video.preload = 'auto';
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [ref, enabled, threshold]);
}

/** True on devices with a real hover pointer (mouse/trackpad); false on touch, and before mount. */
export function useHoverCapable() {
  const [canHover, setCanHover] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return canHover;
}
