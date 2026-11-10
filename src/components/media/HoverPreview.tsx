'use client';

import * as React from 'react';
import { useHoverCapable, usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

interface HoverPreviewProps {
  /** Silent mp4 to play while hovered. Nothing is requested until the first hover. */
  src: string;
  /** 'multiply' for white-background clips on light surfaces; 'plain' for dark-background clips on dark surfaces. */
  blend?: 'multiply' | 'plain';
  /** Fade the static children out while the clip plays (default true). */
  hideChildren?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps a static image; on hover (mouse/trackpad only, never on touch, never under
 * prefers-reduced-motion) a muted clip fades in on top and plays, and resets when the pointer leaves.
 */
export function HoverPreview({ src, blend = 'multiply', hideChildren = true, className, children }: HoverPreviewProps) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const canHover = useHoverCapable();
  const reduced = usePrefersReducedMotion();
  const enabled = canHover && !reduced;

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, armed]);

  const start = () => {
    setArmed(true);
    setActive(true);
  };
  const stop = () => setActive(false);

  return (
    <div
      className={cn('relative', className)}
      onPointerEnter={enabled ? start : undefined}
      onPointerLeave={enabled ? stop : undefined}
      onFocus={enabled ? start : undefined}
      onBlur={enabled ? stop : undefined}
    >
      <div className={cn('h-full w-full transition-opacity duration-300', active && hideChildren && 'opacity-0')}>{children}</div>
      {armed && (
        <video
          ref={ref}
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
            active ? 'opacity-100' : 'opacity-0',
            blend === 'multiply' && 'mix-blend-multiply',
          )}
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
