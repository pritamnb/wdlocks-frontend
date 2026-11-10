'use client';

import * as React from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { BRAND_VIDEO } from '@/lib/constants';
import { cn } from '@/lib/cn';

/**
 * Poster with a play button that opens the 40-second manufacturer film (with sound) in the
 * site modal. Nothing downloads until the visitor asks for it.
 */
export function WatchFilm({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const film = BRAND_VIDEO.film;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative block w-full overflow-hidden rounded-[1.5rem] bg-near-black text-left shadow-card ring-1 ring-cream-dark transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red',
          className,
        )}
        aria-haspopup="dialog"
      >
        <div className={cn('relative w-full', compact ? 'aspect-[21/9]' : 'aspect-video')}>
          <Image src={film.poster} alt="" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover opacity-90 transition-[opacity,transform] duration-500 group-hover:scale-[1.02] group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-near-black/80 via-near-black/10 to-transparent" aria-hidden="true" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red text-white shadow-xl ring-4 ring-white/20 transition-transform duration-150 group-hover:scale-105" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-grey">Watch the film</p>
              <p className="mt-0.5 font-playfair text-lg font-semibold leading-tight sm:text-xl">{film.title}</p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums backdrop-blur">{film.durationLabel}</span>
          </div>
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="film-title" variant="center" size="wide" returnFocusTo={triggerRef} className="overflow-hidden rounded-[1.5rem] bg-near-black p-0">
        <div className="flex items-center justify-between gap-4 px-5 py-3 text-white">
          <h2 id="film-title" className="font-playfair text-lg font-semibold">{film.title}</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
            Close
          </button>
        </div>
        {open && (
          <video className="aspect-video w-full bg-black" controls autoPlay playsInline preload="metadata" poster={film.poster}>
            <source src={film.mp4} type="video/mp4" />
            Your browser cannot play this video. <a href={film.mp4} className="underline">Download it instead</a>.
          </video>
        )}
        <p className="px-5 py-3 text-xs text-white/60">Manufacturer film. Chapters: dimple and snake key · 11 pins, 870,000 combinations · Always Locked Protection System · engraved markings.</p>
      </Modal>
    </>
  );
}
