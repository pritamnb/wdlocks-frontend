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
    let inView = false;
    const sync = () => {
      if (inView && !document.hidden) {
        if (video.preload === 'none') video.preload = 'auto';
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        // Decide on the visible ratio, not just "touching the viewport": with a single threshold the
        // callback fires while the element is still partly visible, which used to restart playback
        // as the visitor scrolled away. Several thresholds mean leaving the viewport always fires too.
        inView = entry.isIntersecting && entry.intersectionRatio >= threshold;
        sync();
      },
      { threshold: Array.from(new Set([0, 0.25, 0.5, 0.75, 1, threshold])).sort() },
    );
    // Pause in a background tab and resume when the visitor comes back, if the player is still on screen.
    const onVisibility = () => sync();
    document.addEventListener('visibilitychange', onVisibility);
    io.observe(video);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
