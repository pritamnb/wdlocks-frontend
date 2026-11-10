import Image from 'next/image';

const items = [
  { src: '/brand/sold-secure-diamond.png', title: 'Approved by locksmiths.', body: 'Sold Secure Diamond. Few cylinders survive the test designed with the Master Locksmiths Association and carried out by working locksmiths.' },
  { src: '/brand/secured-by-design.png', title: 'Police Preferred Specification.', body: 'Secured by Design, the official UK Police initiative that combines designing out crime with proven physical security.' },
  { src: '/brand/bsi-kitemark.webp', title: 'Approved by British Standards.', body: 'The BSI Kitemark is the standard recognised around the world. Watchdog holds the highest 3 Star TS 007 rating, licence KM597142.' },
];

/** Ultion's three stacked accreditation explainers, as three columns on desktop. */
export function Accreditations() {
  return (
    <section className="py-20" aria-label="Accreditations explained">
      <div className="container-wd grid gap-12 md:grid-cols-3">
        {items.map((i) => (
          <article key={i.title} className="text-center">
            <div className="relative mx-auto h-28 w-28">
              <Image src={i.src} alt="" fill sizes="112px" className="object-contain" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-near-black">{i.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-charcoal/80">{i.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
