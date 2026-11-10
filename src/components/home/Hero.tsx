'use client';

import * as React from 'react';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { FilmPlayer } from '@/components/media/FilmPlayer';
import { BRAND_VIDEO, GUARANTEE, SITE, VIDEO_BAR } from '@/lib/constants';
import { useInViewPlayback, usePrefersReducedMotion } from '@/hooks/useInViewPlayback';

/**
 * Full-bleed cinematic hero (Ultion pattern): a muted looping film behind the headline, two
 * calls to action, and a floating £5,000 guarantee card. Until the client supplies a door film,
 * the background is the manufacturer's turntable render.
 */
export function Hero() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  useInViewPlayback(videoRef, !reduced, 0.2);
  const [film, setFilm] = React.useState<(typeof VIDEO_BAR)[number] | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const explainer = VIDEO_BAR[0];

  return (
    <section className="relative isolate overflow-hidden bg-near-black text-white" aria-labelledby="hero-title">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-70"
        muted
        loop
        playsInline
        preload="none"
        poster={BRAND_VIDEO.turntable.poster}
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={BRAND_VIDEO.turntable.mp4} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-r from-near-black via-near-black/80 to-near-black/20" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-near-black to-transparent" aria-hidden="true" />

      <div className="container-wd relative grid min-h-[78vh] items-center gap-10 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red">Watchdog lock protection</p>
          <h1 id="hero-title" className="heading-display mt-4 text-[2.75rem] leading-[1.02] text-white sm:text-6xl lg:text-[4.75rem]">
            A snapped lock takes <span className="text-red">seconds</span>.
            <br className="hidden sm:block" /> A Watchdog doesn&rsquo;t snap.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            {SITE.tagline} BSI Kitemarked 3 Star, Sold Secure Diamond, fitted in five minutes with one screwdriver.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/products/3-star-alps-cylinder-door-lock" size="lg">
              Get a Watchdog lock
            </ButtonLink>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setFilm(explainer)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors duration-150 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
              aria-haspopup="dialog"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-near-black" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
              Watch full video ({explainer.durationLabel.replace(/^0/, '')})
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 lg:justify-self-end">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-near-black shadow-2xl">
            <p className="font-playfair text-2xl font-semibold leading-tight">Get your {GUARANTEE.amountLabel} guarantee</p>
            <p className="mt-2 text-sm text-charcoal/75">Register your lock and key number in two minutes. Free for every genuine Watchdog.</p>
            <a href={GUARANTEE.href} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-near-black px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red">
              Activate now
            </a>
          </div>
        </div>
      </div>

      <Link href="#products" className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 transition-colors hover:text-white" aria-label="Scroll to products">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </Link>

      <FilmPlayer film={film} onClose={() => setFilm(null)} returnFocusTo={triggerRef} />
    </section>
  );
}
