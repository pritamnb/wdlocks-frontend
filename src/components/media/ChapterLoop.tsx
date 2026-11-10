'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_VIDEO, type ClipId } from '@/lib/constants';
import { useInViewPlayback, usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

interface ChapterLoopProps {
  clip: ClipId;
  /** 'multiply' hides the clip's white background on cream/white panels; 'plain' for a framed viewer on dark panels. */
  blend?: 'multiply' | 'plain';
  className?: string;
}

/**
 * Silent 4–10 s chapter cut from the manufacturer's explainer film. Fades to white at both ends,
 * so with `blend="multiply"` on a cream surface the white disappears and only the lock remains.
 */
export function ChapterLoop({ clip, blend = 'multiply', className }: ChapterLoopProps) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  useInViewPlayback(ref, !reduced);
  const c = BRAND_VIDEO.clips[clip];

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden', blend === 'multiply' && 'mix-blend-multiply', className)}>
      {reduced ? (
        <Image src={c.poster} alt={c.alt} fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
      ) : (
        <video
          ref={ref}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster={c.poster}
          aria-label={c.alt}
        >
          <source src={c.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
