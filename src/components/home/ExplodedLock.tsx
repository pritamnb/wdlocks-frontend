'use client';

import * as React from 'react';
import { BRAND_RENDERS } from '@/lib/constants';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

const SLICES = 7;

/**
 * Ultion's "exploded lock" moment, built from the Watchdog render: the cylinder is cut into vertical
 * slices that sit assembled, then spring apart once the section scrolls into view (plays once), with
 * a little vertical drift and tilt per slice so it reads as parts, not stripes. Reduced motion shows
 * the exploded state without animating.
 */
export function ExplodedLock({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [exploded, setExploded] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          setExploded(true);
          io.disconnect();
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const img = BRAND_RENDERS.heroCylinder;
  const show = exploded || reduced;
  // Offsets fan the slices out from the centre; the middle slice (the cam) stays put.
  const offsets = Array.from({ length: SLICES }, (_, i) => {
    const d = i - (SLICES - 1) / 2; // -3..3
    return { x: d * 9, y: (i % 2 === 0 ? -1 : 1) * Math.abs(d) * 4, r: d * 1.6 };
  });

  return (
    <div
      ref={ref}
      className={cn('relative mx-auto w-full max-w-[760px]', className)}
      style={{ aspectRatio: `${img.width} / ${img.height}` }}
      role="img"
      aria-label={`${img.alt}, shown as an exploded view of its parts`}
    >
      {offsets.map((o, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-y-0 will-change-transform"
          style={{
            left: `${(i / SLICES) * 100}%`,
            width: `calc(${100 / SLICES}% + 0.5px)`,
            backgroundImage: `url(${img.src})`,
            backgroundSize: `${SLICES * 100}% 100%`,
            backgroundPosition: `${(i / (SLICES - 1)) * 100}% 0`,
            backgroundRepeat: 'no-repeat',
            transform: show ? `translate(${o.x}%, ${o.y}%) rotate(${o.r}deg)` : 'translate(0, 0) rotate(0deg)',
            transition: reduced ? 'none' : `transform 1.6s cubic-bezier(0.22, 1, 0.36, 1) ${0.08 * Math.abs(i - (SLICES - 1) / 2)}s`,
            filter: show ? 'drop-shadow(0 30px 40px rgb(0 0 0 / 0.55))' : 'drop-shadow(0 20px 30px rgb(0 0 0 / 0.45))',
          }}
        />
      ))}
    </div>
  );
}
