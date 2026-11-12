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
 * Client, 12 Nov: "the images should be big", then "increase the spacing and make it responsive". Ultion's 249 × 207
 * box left the tall Sold Secure mark at 85 px wide, and three columns from 640 px squashed every mark to 176 px with
 * the titles wrapping. Now: the columns stack until lg (one centred column, 420 px wide at most), then sit three
 * across with 72–96 px between them. Each mark fills a 6:5 box that follows its column (up to 400 px wide), so the
 * marks scale with the viewport instead of a fixed pixel height: Sold Secure ≈ 280 px tall on a phone and at 1440,
 * Secured by Design the full box width. Secured by Design is the old site's own 1240 px upload, trimmed; Sold Secure
 * (218 px) and the Kitemark (300 px) have no larger source and the official artwork is only issued to licensees, so
 * they are soft on 2× screens until the client supplies originals. Spacing: 40 px mark → title, 24 px title → text,
 * 80 px between stacked items, 16/24 px more section padding than Ultion.
 */
export function Accreditations() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="accreditations-title">
      <div className="container-wd">
        <h2 id="accreditations-title" className="heading-display mb-14 text-center text-3xl sm:text-4xl lg:mb-20">Tested, not claimed.</h2>
        <ol className="grid gap-y-20 lg:grid-cols-3 lg:gap-x-[72px] lg:gap-y-0 xl:gap-x-24">
          {items.map((i) => (
            <li key={i.title} className="mx-auto flex w-full max-w-[420px] flex-col items-center text-center lg:max-w-none">
              <div className="relative flex aspect-[6/5] w-full max-w-[400px] items-center justify-center">
                {/* `fill` + object-contain: sized by the box. With width/height and w-auto the browser sizes the
                    img from the srcset density (218 px source ÷ 640w/400px = 136 px), which shrank the marks. */}
                <Image src={i.src} alt={i.alt} fill sizes="(min-width: 640px) 400px, 90vw" className="object-contain" />
              </div>
              <h3 className="mt-10 font-sans text-[22px] font-medium leading-[1.1] tracking-[-0.04em] text-[#504e4e] lg:text-[26px]">{i.title}</h3>
              <p className="mt-6 max-w-[385px] text-[16px] font-light leading-6 text-[#504e4e]">{i.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
