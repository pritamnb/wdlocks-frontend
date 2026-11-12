import Image from 'next/image';
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed';

/** The Watchdog TV advert ("The Tale", 30 s) as shown on Sky Sports — the client's YouTube upload. */
const YOUTUBE_ID = 'z7YV2BYb5Ps';
const TITLE = 'Watchdog Locksmiths TV advert, as seen on Sky Sports';

/**
 * "How we protect you" (client, 11 Nov, mirroring the block of the same name on wdlocks.co.uk): the Sky Sports
 * advert, autoplaying muted once the block scrolls into view (YouTubeEmbed loads the player only then).
 */
export function SkySports() {
  return (
    <section className="bg-white py-16 lg:py-24" aria-labelledby="sky-sports-title">
      <div className="container-wd">
        {/* Client, 12 Nov: the logo as large as on wdlocks.co.uk — "As seen on" on its own line, the Sky Sports mark
            under it at about 70% of a phone's width (440 px on desktop). The 1000 px render is the old site's own
            upload, trimmed; the 300 px one went soft at this size. */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="sky-sports-title" className="heading-display text-3xl sm:text-4xl lg:text-5xl">How we protect you</h2>
          <p className="mt-6 text-base font-semibold uppercase tracking-[0.16em] text-charcoal/70 sm:text-lg">As seen on</p>
          <Image src="/brand/sky-sports-logo.webp" alt="Sky Sports" width={1000} height={214} sizes="(min-width: 640px) 440px, 70vw" className="mx-auto mt-4 h-auto w-[70%] max-w-[440px]" />
        </div>
        <YouTubeEmbed id={YOUTUBE_ID} title={TITLE} poster="/brand/sky-sports-poster.jpg" className="mx-auto mt-10 max-w-5xl rounded-2xl" />
      </div>
    </section>
  );
}
