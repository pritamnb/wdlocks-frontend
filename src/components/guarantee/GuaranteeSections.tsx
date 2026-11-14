import Image from 'next/image';
import Link from 'next/link';
import { BRAND_RENDERS, GUARANTEE, GUARANTEE_PAGE, PRODUCT_IDS } from '@/lib/constants';
import { productHref } from '@/lib/api';

/** "What's covered": the four big figures and the nine conditions from clause 14 of the terms. */
export function Covered() {
  return (
    <section className="bg-cream py-20 lg:py-28" aria-labelledby="covered-title">
      <div className="container-wd">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">What the guarantee covers</p>
        <h2 id="covered-title" className="heading-display mt-3 max-w-2xl text-3xl sm:text-4xl lg:text-5xl">
          If a burglar snaps a registered Watchdog lock, we pay.
        </h2>
        <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEE_PAGE.figures.map((f) => (
            <div key={f.value} className="rounded-2xl bg-warm-white p-6 shadow-card">
              <dt className="order-2 mt-1 text-sm text-charcoal/70">{f.label}</dt>
              <dd className="font-playfair text-4xl font-semibold text-red sm:text-5xl">{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <h3 className="heading-display text-xl">The conditions, in plain English</h3>
            <p className="mt-2 text-sm text-charcoal/70">All nine must apply. This is a summary; clause 14 of the terms is what counts.</p>
          </div>
          <ol className="space-y-3">
            {GUARANTEE_PAGE.conditions.map((c, i) => (
              <li key={c} className="flex gap-3 text-sm leading-relaxed text-charcoal/85">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-near-black text-[11px] font-semibold text-white" aria-hidden="true">{i + 1}</span>
                {c}
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-8 text-sm">
          <a href={GUARANTEE.termsUrl} className="font-semibold text-red underline-offset-4 hover:underline">Read the full terms and conditions →</a>
        </p>
      </div>
    </section>
  );
}

/** "How to claim": three steps. */
export function HowToClaim() {
  return (
    <section className="bg-near-black py-20 text-white lg:py-28" aria-labelledby="claim-title">
      <div className="container-wd">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">If the worst happens</p>
        <h2 id="claim-title" className="heading-display mt-3 text-3xl text-white sm:text-4xl">How to claim.</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {GUARANTEE_PAGE.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-[#111013] p-6 ring-1 ring-white/10">
              <p className="font-playfair text-4xl font-semibold leading-none text-red" aria-hidden="true">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-xs text-white/50">Claims must be submitted within 14 days of the incident on the Watchdog claim form, with the documents and items listed on its checklist. Call {`0203 857 4718`} if you need the form sent to you.</p>
      </div>
    </section>
  );
}

/** "Keep it valid": genuine keys and lubrication, each linking to the product. */
export async function KeepValid() {
  const [keysHref, lubricantHref] = await Promise.all([productHref(PRODUCT_IDS.EXTRA_KEYS_3), productHref(PRODUCT_IDS.LUBRICANT)]);
  const tiles = [
    {
      eyebrow: 'Genuine keys only',
      title: 'Copied keys void the guarantee.',
      body: 'Only a key cut by Watchdog to your key number keeps the lock, and the guarantee, as they should be. Extra keys are cut to order and dispatched the same day before 2pm.',
      cta: 'Order extra keys',
      href: keysHref,
      render: BRAND_RENDERS.keysEngraved,
    },
    {
      eyebrow: 'Every 6 months',
      title: 'A drop of lubricant keeps it covered.',
      body: 'The terms ask for Lution XM every 6 months or 5,000 cycles, whichever comes first. It keeps the eleven pins moving freely and the guarantee valid.',
      cta: 'Buy lock lubricant',
      href: lubricantHref,
      render: BRAND_RENDERS.cylinderDetail,
    },
  ];
  return (
    <section className="bg-cream py-20 lg:py-28" aria-labelledby="valid-title">
      <div className="container-wd">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">Keep it valid</p>
        <h2 id="valid-title" className="heading-display mt-3 text-3xl sm:text-4xl">Two habits that keep the £5,000 in place.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {tiles.map((t) => (
            <article key={t.title} className="grid overflow-hidden rounded-2xl bg-warm-white shadow-card sm:grid-cols-[1fr_180px]">
              <div className="p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">{t.eyebrow}</p>
                <h3 className="heading-display mt-2 text-xl">{t.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal/80">{t.body}</p>
                <Link href={t.href} className="mt-5 inline-flex h-10 items-center rounded-full bg-near-black px-5 text-sm font-semibold text-white transition-colors hover:bg-red">{t.cta}</Link>
              </div>
              <div className="relative hidden bg-cream sm:block">
                <Image src={t.render.src} alt="" width={t.render.width} height={t.render.height} sizes="180px" className="absolute inset-0 h-full w-full object-contain p-4" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Ultion's "Key security promise" → key-copy protection by key number. */
export async function KeyControl() {
  const keysHref = await productHref(PRODUCT_IDS.EXTRA_KEYS_3);
  return (
    <section className="relative overflow-hidden bg-[#1b1a1c] py-20 text-white lg:py-28" aria-labelledby="keycontrol-title">
      <div className="container-wd grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">Key-copy protection</p>
          <h2 id="keycontrol-title" className="heading-display mt-3 text-3xl text-white sm:text-4xl lg:text-5xl">Your key number is yours alone.</h2>
          <p className="mt-5 max-w-lg text-white/75">
            Watchdog keys cannot be cut on a high-street machine. Register the number stamped on your key and we will only ever cut a copy for the person who registered it. Lost one? Order it here and it is cut to your number and sent the same day.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#activate" className="inline-flex h-11 items-center rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-deep">Register your key number</a>
            <Link href={keysHref} className="inline-flex h-11 items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:border-red hover:text-red">Order extra keys</Link>
          </div>
        </div>
        <div className="lg:col-span-6">
          <Image src={BRAND_RENDERS.keysEngraved.src} alt={BRAND_RENDERS.keysEngraved.alt} width={BRAND_RENDERS.keysEngraved.width} height={BRAND_RENDERS.keysEngraved.height} sizes="(min-width: 1024px) 520px, 90vw" className="mx-auto w-full max-w-lg drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)]" />
        </div>
      </div>
    </section>
  );
}
