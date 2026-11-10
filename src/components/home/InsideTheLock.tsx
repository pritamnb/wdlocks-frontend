import { BRAND_VIDEO } from '@/lib/constants';
import { InlineFilm } from '@/components/media/InlineFilm';

const film = BRAND_VIDEO.insideFilm;

/** The manufacturer's 38 s macro journey through the cylinder, inline on the dark panel. */
export function InsideTheLock() {
  return (
    <section className="border-t border-white/10 bg-near-black py-20 text-white" aria-labelledby="inside-title">
      <div className="container-wd">
        <InlineFilm
          src={film.mp4}
          poster={film.poster}
          ariaLabel={film.title}
          chapters={film.chapterList}
          aspectClass="aspect-[5/4]"
          tone="dark"
          caption={`Manufacturer film · ${film.durationLabel} · plays silently until you turn the sound on.`}
          heading={
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Inside the lock</p>
              <h2 id="inside-title" className="heading-display mt-3 text-3xl text-white sm:text-4xl">
                A camera journey through a Watchdog.
              </h2>
              <p className="mt-4 text-white/75">
                Follow the key into the cylinder and past every layer that stops a burglar. Pick a chapter to jump straight to it.
              </p>
            </>
          }
        />
      </div>
    </section>
  );
}
