import Image from 'next/image';

/** Copy from the client's own accreditation panels on wdlocks.co.uk (10 Nov 2026). */
const items = [
  {
    src: '/brand/accreditations/sold-secure-diamond-mark.png',
    eyebrow: 'The Sold Secure Diamond Standard 2024',
    title: 'The toughest test ever.',
    body: 'The Watchdog lock passes even the most robust security standard, the Sold Secure Diamond Standard 2024. The trusted anti-snap and anti-bump lock that keeps your property secure.',
  },
  {
    src: '/brand/accreditations/bsi-kitemark-clear.png',
    eyebrow: 'BSI Kitemark',
    title: 'British Standards.',
    body: 'The BSI Kitemark is one of the most recognised symbols of quality and safety in the UK, and is acknowledged around the world too. Watchdog holds the highest 3 Star TS 007 rating, licence KM597142.',
  },
  {
    src: '/brand/accreditations/secured-by-design-mark.png',
    eyebrow: 'Secured by Design (SBD) locks',
    title: 'Secured by Design.',
    body: 'Secured by Design operates an accreditation scheme on behalf of the UK police for products or services that have met recognised security standards: the Police Preferred Specification.',
  },
];

/** Ultion's three stacked accreditation explainers: big mark, eyebrow, large headline and the explanation, alternating sides. */
export function Accreditations() {
  return (
    <section className="bg-white py-20 lg:py-28" aria-labelledby="accreditations-title">
      <div className="container-wd">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Approved by locksmiths</span>
          <h2 id="accreditations-title" className="heading-display mt-5 text-4xl sm:text-5xl">Tested, not claimed.</h2>
        </div>
        <ol className="mt-16 space-y-16 lg:space-y-24">
          {items.map((i, idx) => (
            <li key={i.title} className={`grid items-center gap-10 lg:grid-cols-12 ${idx % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
              <div className="relative mx-auto flex h-56 w-56 items-center justify-center rounded-full bg-cream sm:h-64 sm:w-64 lg:col-span-5 lg:h-72 lg:w-72">
                {/* Marks are trimmed to their visible bounds (public/brand/accreditations) so each fills the same share of the circle. */}
                <Image src={i.src} alt="" width={240} height={240} sizes="(min-width: 1024px) 250px, 200px" className="h-[84%] w-[84%] object-contain" />
              </div>
              <div className="text-center lg:col-span-7 lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">{i.eyebrow}</p>
                <h3 className="heading-display mt-3 text-3xl sm:text-4xl lg:text-5xl">{i.title}</h3>
                <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-charcoal/80 lg:mx-0">{i.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
