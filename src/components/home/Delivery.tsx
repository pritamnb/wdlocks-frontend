import { SITE, SHIPPING_OPTIONS } from '@/lib/constants';
import { formatPrice } from '@/lib/wdlocks-api';
import { DeliveryPromise } from '@/components/product/DeliveryPromise';

export function Delivery() {
  return (
    <section id="delivery" className="scroll-mt-24 pb-20" aria-labelledby="delivery-title">
      <div className="container-wd grid gap-8 rounded-[2rem] border border-cream-dark bg-cream-mid p-8 sm:p-12 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Delivery &amp; help</p>
          <h2 id="delivery-title" className="heading-display mt-3 text-3xl">Order today, dispatched today.</h2>
          <div className="mt-5">
            <DeliveryPromise compact />
          </div>
        </div>
        <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-warm-white p-5 ring-1 ring-cream-dark">
            <h3 className="font-semibold text-near-black">Delivery options</h3>
            <ul className="mt-3 divide-y divide-cream-dark text-sm">
              {SHIPPING_OPTIONS.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-medium text-near-black">{o.label}</span>
                    <span className="block text-xs text-charcoal/75">{o.eta}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-near-black">{formatPrice(o.pricePence)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-charcoal/75">Chosen at checkout. Orders before {SITE.dispatchCutoff} Mon–Fri ship the same working day.</p>
          </div>
          <div className="rounded-2xl bg-warm-white p-5 ring-1 ring-cream-dark">
            <h3 className="font-semibold text-near-black">Talk to a human</h3>
            <p className="mt-2 text-sm text-charcoal/85">Not sure which size or whether a thumb turn suits your door? Our team fits these locks every day.</p>
            <a href={SITE.phoneHref} className="mt-4 block font-playfair text-2xl font-semibold text-near-black hover:text-red">{SITE.phone}</a>
            <a href={SITE.freephoneHref} className="block text-sm text-charcoal/85 hover:text-red">Freephone {SITE.freephone}</a>
            <a href={`mailto:${SITE.email}`} className="mt-1 block text-sm text-charcoal/85 hover:text-red">{SITE.email}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
