import Link from 'next/link';
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed';
import { SITE } from '@/lib/constants';

/** Fitting film: the client's "How to fit a door lock?" (2:18) on the Watchdog Locksmiths YouTube channel. */
const FILM_ID = 'rqd_6g9LcFI';

const STEPS = [
  { title: 'Measure', body: 'From the centre fixing screw to the face of the door furniture on each side. Watchdog cylinders come in 5 mm steps for a flush fit.' },
  { title: 'Swap', body: 'Undo the single fixing screw in the door edge, slide the old cylinder out and the Watchdog in.' },
  { title: 'Test and register', body: 'Turn the key both ways, then register your £5,000 guarantee online in two minutes.' },
];

/**
 * "How to install Watchdog" (Pritam, 12 Nov): the former "One key for all locks" panel, kept in place and renamed, now
 * the home for the fitting film after the "How to install Watchdog" carousel and its films were removed. Left: eyebrow,
 * heading, three numbered steps, two CTAs; right: the film, muted autoplay once in view, with a caption line.
 */
export function InstallSection() {
  return (
    <section className="cream-panel border-y border-cream-dark" aria-labelledby="install-title">
      <div className="container-wd grid items-center gap-12 py-20 lg:grid-cols-12 lg:gap-14 lg:py-24">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">Fitting guide · 2 min 18 s</p>
          <h2 id="install-title" className="heading-display mt-3 text-4xl sm:text-5xl">
            How to install <span className="text-red">Watchdog</span>
          </h2>
          <p className="mt-5 max-w-md text-charcoal/80">
            A Watchdog cylinder swaps into most uPVC, composite and aluminium doors with a single screwdriver. Watch the film, or follow the three steps.
          </p>
          <ol className="mt-8 space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red font-sans text-sm font-semibold text-white" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="font-sans text-base font-semibold text-near-black">{s.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-charcoal/75">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products/3-star-alps-cylinder-door-lock" className="inline-flex h-12 items-center rounded-full bg-red px-7 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
              Shop cylinders
            </Link>
            <Link href="/products/3-star-alps-cylinder-door-lock#sizing" className="inline-flex h-12 items-center rounded-full border border-near-black px-7 text-sm font-semibold text-near-black transition-colors duration-150 hover:border-red hover:text-red">
              Sizing guide
            </Link>
          </div>
        </div>
        <div className="lg:col-span-7">
          <YouTubeEmbed id={FILM_ID} title="How to fit a door lock? Watchdog fitting film" poster="/brand/keyed-alike-poster.jpg" className="rounded-[2rem]" />
          <p className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-charcoal/70">
            <span>“How to fit a door lock?” · Watchdog Locksmiths on YouTube</span>
            <span>
              Rather we talked you through it? <a href={SITE.phoneHref} className="font-semibold text-near-black hover:text-red">{SITE.phone}</a>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
