'use client';

import * as React from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { VIDEO_BAR, type VideoBarEntry } from '@/lib/constants';
import { cn } from '@/lib/cn';

/**
 * "See Watchdog in action": a row of film cards with duration and a "Watch full video" button,
 * each opening a dark player with native controls and sound. Pattern requested by the client
 * (mirrors Ultion's "See Ultion in action" bar), in Watchdog red.
 */
export function VideoBar() {
  const [active, setActive] = React.useState<VideoBarEntry | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <section className="border-b border-cream-dark bg-cream py-16" aria-labelledby="in-action-title">
      <div className="container-wd">
        <h2 id="in-action-title" className="heading-display text-center text-3xl sm:text-4xl">
          See <span className="text-red">Watchdog</span> in action
        </h2>
        <ul className="mt-10 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4" role="list">
          {VIDEO_BAR.map((v) => (
            <li key={v.id} className="w-[82vw] shrink-0 snap-center sm:w-auto">
              <figure className="group">
                <div className="relative overflow-hidden rounded-2xl bg-near-black shadow-card ring-1 ring-cream-dark">
                  <div className="relative aspect-[4/3] w-full">
                    <Image src={v.poster} alt="" fill sizes="(max-width: 640px) 82vw, (max-width: 1024px) 50vw, 25vw" className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-near-black/70 via-transparent to-near-black/10" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={(e) => {
                        triggerRef.current = e.currentTarget;
                        setActive(v);
                      }}
                      className="absolute left-1/2 top-1/2 inline-flex h-11 -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-md bg-red px-5 text-sm font-semibold text-white shadow-lg transition-colors duration-150 hover:bg-red-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      aria-haspopup="dialog"
                      aria-label={`Watch full video: ${v.title}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                      Watch full video
                    </button>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm font-semibold tabular-nums text-red drop-shadow">{v.durationLabel}</span>
                  </div>
                </div>
                <figcaption className="mt-3 text-center text-[15px] font-medium text-charcoal">{v.title}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        labelledBy="in-action-player-title"
        variant="center"
        size="wide"
        returnFocusTo={triggerRef}
        className="overflow-hidden rounded-[1.5rem] !bg-near-black p-0 text-white"
      >
        {active && (
          <>
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <h2 id="in-action-player-title" className="font-playfair text-lg font-semibold">{active.title}</h2>
              <button type="button" onClick={() => setActive(null)} className="rounded-full px-3 py-1 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
                Close
              </button>
            </div>
            <video
              key={active.id}
              className={cn('mx-auto w-full bg-black', active.aspect === '5/4' ? 'aspect-[5/4] max-h-[78dvh]' : 'aspect-video')}
              controls
              autoPlay
              playsInline
              preload="metadata"
              poster={active.poster}
            >
              <source src={active.mp4} type="video/mp4" />
            </video>
            <p className="px-5 py-3 text-xs text-white/60">{active.blurb}</p>
          </>
        )}
      </Modal>
    </section>
  );
}
