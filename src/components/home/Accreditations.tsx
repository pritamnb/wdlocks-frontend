import Image from 'next/image';

/** Copy from the client's own accreditation panels on wdlocks.co.uk (10 Nov 2026); titles follow Ultion's pattern. */
const items = [
  {
    src: '/brand/accreditations/sold-secure-diamond-mark.png',
    width: 218,
    height: 230,
    alt: 'Sold Secure Diamond',
    title: 'The toughest test ever.',
    body: 'Sold Secure Diamond 2024. The Watchdog lock passes the most robust security standard there is: the test designed with the Master Locksmiths Association and carried out by locksmiths.',
  },
  {
    src: '/brand/accreditations/secured-by-design-mark-1240.png',
    width: 1240,
    height: 760,
    alt: 'Secured by Design',
    title: 'Police Preferred Specification.',
    body: 'Secured by Design operates an accreditation scheme on behalf of the UK police for products that have met recognised security standards: the Police Preferred Specification.',
  },
  {
    src: '/brand/accreditations/bsi-kitemark-clear.png',
    width: 300,
    height: 300,
    alt: 'BSI Kitemark TS 007 3 Star',
    title: 'Approved by British Standards.',
    body: 'The BSI Kitemark is one of the most recognised symbols of quality and safety in the UK and around the world. Watchdog holds the highest 3 Star TS 007 rating, licence KM597142.',
  },
];

/**
 * Ultion's `section-ultion-accreditations`, measured 11 Nov 2026: three equal columns (385 px at 1440, 60/40 px
 * section padding), each with the mark (249 × 207), 30 px, a 26 px / 500 title tracked −1 px, 30 px, then 16 px / 300
 * text on 24 px leading, all centred in #504e4e. Phones stack the columns with 180 × 150 marks and 22 px titles.
 *
 * Client, 12 Nov: "the images should be big". Ultion's 249 × 207 box left the tall Sold Secure mark at 85 px wide and
 * the Kitemark at 117 px, so the marks now share one HEIGHT (200 px on phones, 260 px from lg) and scale to it: Sold
 * Secure ≈ 246 px wide, the Kitemark 260 px, Secured by Design ≈ 400 px (its 1240 px render is the old site's own
 * upload, trimmed). Sold Secure (218 px) and the Kitemark (300 px) have no larger source on wdlocks.co.uk, and the
 * official artwork is only issued to licensees, so they are soft on 2× screens until the client supplies originals.
 */
export function Accreditations() {
  return (
    <section className="bg-white py-14 lg:py-[60px]" aria-labelledby="accreditations-title">
      <div className="container-wd">
        <h2 id="accreditations-title" className="heading-display mb-12 text-center text-3xl sm:text-4xl lg:mb-16">Tested, not claimed.</h2>
        <ol className="grid gap-12 sm:grid-cols-3 sm:gap-8 lg:gap-[72px]">
          {items.map((i) => (
            <li key={i.title} className="flex flex-col items-center text-center">
              <div className="relative flex h-[200px] w-full items-center justify-center lg:h-[260px]">
                <Image src={i.src} alt={i.alt} width={i.width} height={i.height} sizes="(min-width: 1024px) 400px, 320px" className="h-full w-auto max-w-full object-contain" />
              </div>
              <h3 className="mt-[30px] font-sans text-[22px] font-medium leading-[1.1] tracking-[-0.04em] text-[#504e4e] lg:text-[26px]">{i.title}</h3>
              <p className="mt-[30px] max-w-[385px] text-[16px] font-light leading-6 text-[#504e4e]">{i.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
