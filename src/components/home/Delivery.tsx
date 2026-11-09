import { SITE } from '@/lib/constants';
import { formatPrice } from '@/lib/wdlocks-api';

export function Delivery() {
  return (
    <section id="delivery" className="scroll-mt-24 py-20" aria-labelledby="delivery-title">
      <div className="container-wd grid gap-8 rounded-[2rem] bg-cream-mid p-8 sm:p-12 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Delivery & help</p>
          <h2 id="delivery-title" className="heading-display mt-3 text-3xl">Ordered today, fitted tomorrow.</h2>
        </div>
        <dl className="grid gap-6 sm:grid-cols-3 lg:col-span-2">
          <div>
            <dt className="font-semibold text-near-black">Free UK delivery</dt>
            <dd className="mt-1 text-sm text-charcoal/80">On every order over {formatPrice(SITE.freeDeliveryThresholdPence)}. Calculated at checkout below that.</dd>
          </div>
          <div>
            <dt className="font-semibold text-near-black">Same-day dispatch</dt>
            <dd className="mt-1 text-sm text-charcoal/80">Order before {SITE.dispatchCutoff} Monday to Friday and we ship the same working day.</dd>
          </div>
          <div>
            <dt className="font-semibold text-near-black">Talk to a human</dt>
            <dd className="mt-1 text-sm text-charcoal/80">
              <a href={SITE.phoneHref} className="font-medium text-near-black hover:text-red">{SITE.phone}</a>
              <br />
              <a href={`mailto:${SITE.email}`} className="hover:text-red">{SITE.email}</a>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
