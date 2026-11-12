'use client';

import * as React from 'react';
import Image from 'next/image';
import { usePrefersReducedMotion } from '@/hooks/useInViewPlayback';
import { cn } from '@/lib/cn';

type Props = {
  /** The YouTube video id (the part after `youtu.be/`). */
  id: string;
  title: string;
  /** Local poster shown until the player loads; same 16:9 frame so nothing shifts. */
  poster: string;
  className?: string;
};

/**
 * A 16:9 YouTube player (privacy-enhanced domain) that autoplays muted once it scrolls into view. The ~0.5 MB of
 * player script is only fetched then; until then the poster sits in its place. Reduced motion loads the player but
 * does not autoplay. Used for the Sky Sports advert and the keyed-alike film.
 */
export function YouTubeEmbed({ id, title, poster, className }: Props) {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [load, setLoad] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const params = new URLSearchParams({
    autoplay: reduced ? '0' : '1',
    mute: '1',
    loop: '1',
    playlist: id,
    playsinline: '1',
    controls: '1',
    rel: '0',
    modestbranding: '1',
  });

  return (
    <div ref={ref} className={cn('relative aspect-video w-full overflow-hidden bg-near-black shadow-card', className)}>
      {load ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <Image src={poster} alt={title} fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
      )}
    </div>
  );
}
