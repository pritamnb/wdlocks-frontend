'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { getCheckoutStatus } from '@/lib/cart-client';
import { formatPrice } from '@/lib/wdlocks-api';
import { GUARANTEE, SITE } from '@/lib/constants';
import type { CheckoutStatusResponse } from '@/types';

const POLL_MS = 1500;
const MAX_POLLS = 14; // ~20 s: Stripe's webhook normally lands within a couple of seconds

/**
 * Landing page after Stripe confirms (or redirects back from Klarna / PayPal / 3-D Secure). Polls the WooCommerce order
 * until the webhook has marked it paid, then empties the basket and shows the order number.
 */
export function CheckoutReturn() {
  return (
    <React.Suspense fallback={<div className="container-wd py-20 text-center"><Spinner className="mx-auto h-6 w-6" /></div>}>
      <ReturnInner />
    </React.Suspense>
  );
}

function ReturnInner() {
  const params = useSearchParams();
  const orderId = Number(params.get('order'));
  const key = params.get('key') ?? '';
  const redirectStatus = params.get('redirect_status'); // Stripe appends this after redirect flows
  const { clearCart } = useCart();
  const [order, setOrder] = React.useState<CheckoutStatusResponse | null>(null);
  const [state, setState] = React.useState<'checking' | 'paid' | 'pending' | 'failed' | 'invalid'>(orderId && key ? 'checking' : 'invalid');

  React.useEffect(() => {
    if (!orderId || !key) return;
    let polls = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleared = { done: false };
    const tick = async () => {
      try {
        const next = await getCheckoutStatus(orderId, key);
        if (cancelled) return;
        setOrder(next);
        if (next.paid) {
          setState('paid');
          if (!cleared.done) {
            cleared.done = true;
            try {
              sessionStorage.removeItem('wd:checkout-form');
            } catch {
              /* ignore */
            }
            void clearCart();
          }
          return;
        }
        if (next.status === 'failed' || next.status === 'cancelled' || redirectStatus === 'failed') {
          setState('failed');
          return;
        }
      } catch {
        /* keep polling */
      }
      polls += 1;
      if (polls >= MAX_POLLS) {
        setState('pending');
        return;
      }
      timer = setTimeout(() => void tick(), POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, key, redirectStatus, clearCart]);

  return (
    <div className="container-wd py-16 sm:py-24">
      <div className="mx-auto max-w-xl rounded-2xl border border-black/10 bg-[#f7f7f7] p-8 text-center sm:p-12">
        {state === 'checking' && (
          <>
            <Spinner className="mx-auto h-8 w-8 text-red" />
            <h1 className="heading-display mt-6 text-3xl">Confirming your payment…</h1>
            <p className="mt-3 text-sm text-charcoal/75">This usually takes a few seconds. Please don&rsquo;t close this page.</p>
          </>
        )}
        {state === 'paid' && order && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red text-white" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
            </span>
            <h1 className="heading-display mt-6 text-3xl sm:text-4xl">Thank you, your order is confirmed</h1>
            <p className="mt-3 text-charcoal/80">
              Order <strong className="text-near-black">#{order.orderNumber}</strong> · {formatPrice(Math.round(Number(order.total) * 100))}
              {order.email && <> · a confirmation has been sent to <strong className="text-near-black">{order.email}</strong></>}
            </p>
            <p className="mt-4 text-sm text-charcoal/75">Orders placed before {SITE.dispatchCutoff} Monday to Friday are dispatched the same day with Royal Mail tracking.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href={GUARANTEE.href} size="lg">Activate your {GUARANTEE.amountLabel} guarantee</ButtonLink>
              <ButtonLink href="/" variant="secondary" size="lg">Back to the shop</ButtonLink>
            </div>
          </>
        )}
        {state === 'pending' && (
          <>
            <h1 className="heading-display mt-2 text-3xl">Payment received, confirmation on its way</h1>
            <p className="mt-3 text-sm text-charcoal/80">
              Your payment went through but our shop is still writing up the order. You&rsquo;ll get the confirmation email shortly{order ? ` for order #${order.orderNumber}` : ''}. If it hasn&rsquo;t arrived within an hour, call us on{' '}
              <a href={SITE.phoneHref} className="font-semibold text-near-black hover:text-red">{SITE.phone}</a>.
            </p>
          </>
        )}
        {state === 'failed' && (
          <>
            <h1 className="heading-display mt-2 text-3xl">Payment didn&rsquo;t go through</h1>
            <p className="mt-3 text-sm text-charcoal/80">Nothing has been charged. Your basket is still here, so you can try another payment method.</p>
            <ButtonLink href="/checkout" size="lg" className="mt-6">Back to checkout</ButtonLink>
          </>
        )}
        {state === 'invalid' && (
          <>
            <h1 className="heading-display mt-2 text-3xl">We couldn&rsquo;t find that order</h1>
            <p className="mt-3 text-sm text-charcoal/80">
              Check the link in your confirmation email, or <Link href="/contact" className="font-semibold text-near-black underline-offset-2 hover:text-red hover:underline">contact us</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
