'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/wdlocks-api';
import { buildCheckoutUrl, canCheckout } from '@/lib/checkout';
import { estimateDelivery, formatCountdown, formatDeliveryDate } from '@/lib/delivery';
import { SITE, WC_BASE } from '@/lib/constants';

/**
 * Ultion-style checkout page, step one. Details and payment are taken on the WooCommerce checkout at
 * wdlocks.co.uk, so this page reviews the order, shows delivery options and arrival dates, explains what
 * happens next, and hands the basket over.
 */
export function CheckoutReview() {
  const { cart, status, error, itemCount, subtotalPence, pendingKeys, updateCartItem, removeCartItem, refresh, clearCart, shippingOptions } = useCart();
  const [handingOff, setHandingOff] = React.useState(false);
  // Client-only estimate (depends on the clock); server and first client render show nothing.
  const isClient = React.useSyncExternalStore(() => () => {}, () => true, () => false);
  const est = isClient ? estimateDelivery(new Date(), shippingOptions) : null;
  React.useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setHandingOff(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const items = cart?.items ?? [];
  const gate = canCheckout(cart, { handoff: true });

  const continueToPayment = async () => {
    if (!cart || !gate.ok) return;
    setHandingOff(true);
    const url = buildCheckoutUrl(cart);
    await clearCart();
    window.location.assign(url);
  };

  return (
    <div className="container-wd py-10 sm:py-14">
      <h1 className="heading-display text-3xl sm:text-4xl">Checkout</h1>

      {status === 'loading' && !cart ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-64 rounded-2xl lg:col-span-7" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-5" />
        </div>
      ) : status === 'error' && !cart ? (
        <div role="alert" className="mt-8 rounded-2xl border border-cream-dark bg-warm-white p-8 text-center">
          <p className="text-sm text-charcoal/80">{error ?? 'We couldn’t load your basket.'}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refresh()}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-cream-dark bg-warm-white p-12 text-center">
          <p className="font-playfair text-xl font-semibold text-near-black">Nothing to check out yet.</p>
          <ButtonLink href="/#products" size="lg" className="mt-6">Choose a lock</ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <section className="rounded-2xl border border-cream-dark bg-warm-white p-6" aria-labelledby="next-title">
              <h2 id="next-title" className="text-lg font-semibold text-near-black">Your details and payment</h2>
              <p className="mt-2 text-sm text-charcoal/80">
                You&rsquo;ll enter them on our secure checkout at <strong className="text-near-black">wdlocks.co.uk</strong>, the same shop that has sold Watchdog locks for years. Your basket goes with you.
              </p>
              <ol className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                {[
                  ['1', 'Contact', 'Email and phone for your dispatch and tracking updates.'],
                  ['2', 'Address', 'Find your address by postcode. UK delivery only.'],
                  ['3', 'Payment', 'Visa, Mastercard, American Express or PayPal.'],
                ].map(([n, t, b]) => (
                  <li key={n} className="rounded-xl border border-cream-dark bg-cream p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red text-xs font-semibold text-white">{n}</span>
                    <p className="mt-3 font-semibold text-near-black">{t}</p>
                    <p className="mt-1 text-xs text-charcoal/75">{b}</p>
                  </li>
                ))}
              </ol>
              <ul className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-charcoal/70">
                {['Visa', 'Mastercard', 'Amex', 'PayPal', 'Secure checkout'].map((m) => (
                  <li key={m} className="rounded-md border border-cream-dark bg-cream px-2.5 py-1">{m}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-cream-dark bg-warm-white p-6" aria-labelledby="delivery-title">
              <h2 id="delivery-title" className="text-lg font-semibold text-near-black">Delivery options</h2>
              <p className="mt-1 text-sm text-charcoal/75">Chosen on the payment page. Orders before {SITE.dispatchCutoff} Monday to Friday are dispatched the same day.</p>
              <table className="mt-4 w-full text-sm">
                <tbody className="divide-y divide-cream-dark">
                  {shippingOptions.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 pr-3 font-medium text-near-black">{o.label}</td>
                      <td className="py-2.5 pr-3 text-charcoal/75">{o.eta}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-near-black">{formatPrice(o.pricePence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <p className="text-xs text-charcoal/70">
              Got a coupon? Enter it on the payment page. By continuing you agree to the{' '}
              <a href="/terms" className="font-medium text-near-black underline-offset-2 hover:text-red hover:underline">terms</a> and{' '}
              <a href="/privacy" className="font-medium text-near-black underline-offset-2 hover:text-red hover:underline">privacy policy</a>.
            </p>
          </div>

          <aside className="lg:col-span-5">
            <div className="rounded-2xl border border-cream-dark bg-warm-white p-6">
              <h2 className="font-playfair text-xl font-semibold text-near-black">Order summary</h2>
              <ul className="mt-2 divide-y divide-cream-dark">
                {items.map((item) => (
                  <CartLineItem key={item.key} item={item} pending={pendingKeys.has(item.key)} onQuantity={(k, q) => void updateCartItem(k, q)} onRemove={(k) => void removeCartItem(k)} onNavigate={() => undefined} />
                ))}
              </ul>
              <dl className="mt-4 space-y-3 border-t border-cream-dark pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-charcoal/80">Subtotal <span className="text-xs">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span></dt><dd className="font-semibold tabular-nums text-near-black">{formatPrice(subtotalPence)}</dd></div>
                <div className="flex justify-between"><dt className="text-charcoal/80">Delivery</dt><dd className="text-charcoal/80">{shippingOptions[0] ? `from ${formatPrice(shippingOptions[0].pricePence)}` : 'at checkout'}</dd></div>
                <div className="flex justify-between border-t border-cream-dark pt-3"><dt className="font-semibold text-near-black">Total inc. VAT</dt><dd className="font-playfair text-2xl font-semibold tabular-nums text-near-black">{formatPrice(subtotalPence)}<span className="block text-right text-xs font-sans font-normal text-charcoal/70">+ delivery</span></dd></div>
              </dl>
              {!gate.ok && (
                <div role="alert" className="mt-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-xs text-charcoal">
                  {gate.reason} <a href={SITE.phoneHref} className="font-semibold text-near-black hover:text-red">{SITE.phone}</a>
                </div>
              )}
              <Button size="lg" className="mt-5 w-full" onClick={() => void continueToPayment()} loading={handingOff} disabled={!gate.ok || pendingKeys.size > 0}>
                Continue to secure payment
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </Button>
              {est && (
                <p className="mt-3 flex items-center justify-center gap-2 text-sm text-charcoal/80">
                  <span aria-hidden="true">🚚</span>
                  {est.shipsToday ? `Order within ${formatCountdown(est.minutesToCutoff)} and it ships today` : `Ships ${formatDeliveryDate(est.dispatchDate)}`} · arrives {formatDeliveryDate(est.expressDate)} with next-day delivery
                </p>
              )}
              <Link href="/basket" className="mt-3 block text-center text-sm font-medium text-charcoal/75 hover:text-red">Edit basket</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
