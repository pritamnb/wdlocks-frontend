import { InlineFilm } from '@/components/media/InlineFilm';
import { BRAND_VIDEO } from '@/lib/constants';

/** Ultion's centred statement ("Fitting the highest security protection is the key") followed by the explainer with chapters. */
export function WhyWatchdog() {
  return (
    <section id="why-watchdog" className="scroll-mt-24 bg-white py-20" aria-labelledby="why-title">
      <div className="container-wd">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="why-title" className="heading-display text-3xl sm:text-4xl">
            Fitting the highest security protection is the key.
          </h2>
          <p className="mt-5 text-lg text-charcoal/80">
            Your door may look great, feel solid and have a good multi-point lock, but what is the point if it can be disabled
            in seconds through an inadequate cylinder? The cylinder is the one upgrade that changes the outcome.
          </p>
        </div>
        <div className="mt-14">
          <InlineFilm
            src={BRAND_VIDEO.explainerInline.mp4}
            poster={BRAND_VIDEO.explainerInline.poster}
            ariaLabel={BRAND_VIDEO.explainerInline.title}
            chapters={BRAND_VIDEO.explainerInline.chapterList}
            tone="light"
            mediaSide="left"
            caption={`Manufacturer film · ${BRAND_VIDEO.explainerInline.durationLabel} · plays silently until you turn the sound on.`}
            heading={
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">How it works</p>
                <h3 className="heading-display mt-3 text-2xl sm:text-3xl">Built to stop the burglar&rsquo;s favourite trick.</h3>
                <p className="mt-4 text-charcoal/80">Lock snapping accounts for a large share of UK break-ins through uPVC and composite doors. Pick a chapter to see how a Watchdog stops it.</p>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
