'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import type { VideoBarEntry } from '@/lib/constants';
import { cn } from '@/lib/cn';

/** Dark full-width player with native controls and sound, opened from "Watch full video" buttons. */
export function FilmPlayer({ film, onClose, returnFocusTo }: { film: VideoBarEntry | null; onClose: () => void; returnFocusTo?: React.RefObject<HTMLElement | null> }) {
  return (
    <Modal open={film !== null} onClose={onClose} labelledBy="film-player-title" variant="center" size="wide" returnFocusTo={returnFocusTo} className="overflow-hidden rounded-[1.5rem] !bg-near-black p-0 text-white">
      {film && (
        <>
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <h2 id="film-player-title" className="font-playfair text-lg font-semibold">{film.title}</h2>
            <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
              Close
            </button>
          </div>
          <video key={film.id} className={cn('mx-auto w-full bg-black', film.aspect === '5/4' ? 'aspect-[5/4] max-h-[78dvh]' : 'aspect-video')} controls autoPlay playsInline preload="metadata" poster={film.poster}>
            <source src={film.mp4} type="video/mp4" />
          </video>
          <p className="px-5 py-3 text-xs text-white/60">{film.blurb}</p>
        </>
      )}
    </Modal>
  );
}
