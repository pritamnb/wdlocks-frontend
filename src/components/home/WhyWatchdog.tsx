const features = [
  {
    title: 'Anti-snap, by design',
    body: 'Sacrificial snap lines break away under attack while the cam stays locked. The door stays shut.',
  },
  {
    title: 'Anti-bump & anti-pick',
    body: 'Hardened anti-drill pins and a bump-resistant pin stack defeat the most common forced-entry methods.',
  },
  {
    title: 'BSI Kitemark TS 007 3★',
    body: 'Independently tested to the highest domestic standard. Sold Secure Diamond and Secured by Design approved.',
  },
  {
    title: 'Fit it yourself in 5 minutes',
    body: 'Measure, unscrew one fixing, swap the cylinder. Every lock ships with 3 keys and a fitting guide.',
  },
];

export function WhyWatchdog() {
  return (
    <section id="why-watchdog" className="scroll-mt-24 py-20" aria-labelledby="why-title">
      <div className="container-wd">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Why Watchdog</p>
          <h2 id="why-title" className="heading-display mt-3 text-3xl sm:text-4xl">
            Built to stop the burglar’s favourite trick.
          </h2>
          <p className="mt-4 text-charcoal/80">
            Lock snapping accounts for a large share of UK break-ins through uPVC and composite doors.
            A 3-star cylinder is the single most effective upgrade you can make.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <li key={f.title} className="rounded-2xl border border-cream-dark bg-warm-white p-6 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card">
              <span className="font-playfair text-3xl font-semibold text-red/80">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 text-lg font-semibold text-near-black">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{f.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14 overflow-hidden rounded-2xl border border-cream-dark bg-warm-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Standard euro cylinder compared with the Watchdog 3 Star ALPS</caption>
            <thead className="bg-cream-mid text-xs uppercase tracking-[0.12em] text-charcoal/75">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Feature</th>
                <th scope="col" className="px-5 py-3 font-semibold">Standard 1★ cylinder</th>
                <th scope="col" className="px-5 py-3 font-semibold text-red">Watchdog 3 Star ALPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {[
                ['Anti-snap protection', 'Often none', 'Sacrificial snap lines + locked cam'],
                ['Locks itself when the key is removed', 'No', 'Yes — ALPS'],
                ['BSI Kitemark rating', '1 Star (needs a 2★ handle)', '3 Star on its own'],
                ['Sold Secure Diamond 2024', 'No', 'Yes'],
                ['Secured by Design', 'Rarely', 'Yes'],
                ['Key pins / combinations', '5–6 pins', '11 pins · 800,000+'],
                ['Keys in the box', 'Usually 2', '3'],
                ['Security guarantee', 'None', '£5,000 on registration'],
              ].map(([f, a, b]) => (
                <tr key={f}>
                  <th scope="row" className="px-5 py-3 font-medium text-near-black">{f}</th>
                  <td className="px-5 py-3 text-charcoal/80">{a}</td>
                  <td className="px-5 py-3 font-semibold text-near-black">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
