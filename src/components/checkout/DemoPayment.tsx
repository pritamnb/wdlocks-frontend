'use client';

import * as React from 'react';
import type { CreatePaymentIntentResponse } from '@/types';
import { Spinner } from '@/components/ui/Button';
import { confirmDemoPayment, friendlyCartError, CartClientError } from '@/lib/cart-client';
import { formatPrice } from '@/lib/wdlocks-api';
import { FIELD } from '@/lib/checkout-form';
import { cn } from '@/lib/cn';
import { AmexMark, ApplePayMark, CardMark, GooglePayMark, KlarnaMark, MastercardMark, PayPalMark, VisaMark } from './PaymentMarks';

type Method = 'card' | 'paypal' | 'googlepay' | 'applepay' | 'klarna';

const METHODS: Array<{ id: Method; label: string; hint: string }> = [
  { id: 'card', label: 'Card', hint: 'Visa, Mastercard, Amex' },
  { id: 'applepay', label: 'Apple Pay', hint: 'Safari and iPhone' },
  { id: 'googlepay', label: 'Google Pay', hint: 'Chrome and Android' },
  { id: 'paypal', label: 'PayPal', hint: 'Pay in 3 available' },
  { id: 'klarna', label: 'Klarna', hint: 'Pay in 3 interest-free' },
];

/** Each tab carries the provider's own mark in its brand colours, like Stripe's Payment Element tabs. */
const MARK: Record<Method, React.ReactNode> = {
  card: <CardMark className="text-near-black" />,
  applepay: <ApplePayMark className="text-near-black" />,
  googlepay: <GooglePayMark className="text-near-black" />,
  paypal: <PayPalMark />,
  klarna: <KlarnaMark />,
};

/** Pay button in the provider's colours: black Apple Pay / Google Pay, PayPal gold, Klarna pink, our red for cards. */
const BUTTON: Record<Method, string> = {
  card: 'bg-red text-white hover:bg-red-deep',
  applepay: 'bg-black text-white hover:bg-near-black',
  googlepay: 'bg-black text-white hover:bg-near-black',
  paypal: 'bg-[#ffc439] text-[#003087] hover:bg-[#f5b92e]',
  klarna: 'bg-[#ffb3c7] text-near-black hover:bg-[#ffa0ba]',
};

export interface DemoPaymentProps {
  amount: number;
  prepare: () => Promise<CreatePaymentIntentResponse | null>;
  returnUrl: (order: CreatePaymentIntentResponse) => string;
  disabled: boolean;
  onError: (message: string) => void;
  children?: React.ReactNode;
}

function formatCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
function luhn(num: string) {
  const d = num.replace(/\D/g, '');
  if (d.length < 12) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/**
 * Pretend payment step for NEXT_PUBLIC_CHECKOUT_MODE=demo. Looks and behaves like the Stripe Payment Element
 * (method tabs, card fields, wallet buttons) so the whole checkout can be clicked through before the client's
 * Stripe keys exist. Test cards: 4242 4242 4242 4242 pays, 4000 0000 0000 0002 declines, 4000 0025 0000 3155
 * shows a 3-D Secure style challenge. No money moves and no order reaches WooCommerce.
 */
export function DemoPayment({ amount, prepare, returnUrl, disabled, onError, children }: DemoPaymentProps) {
  const [method, setMethod] = React.useState<Method>('card');
  const [card, setCard] = React.useState('');
  const [expiry, setExpiry] = React.useState('');
  const [cvc, setCvc] = React.useState('');
  const [nameOnCard, setNameOnCard] = React.useState('');
  const [busy, setBusy] = React.useState<'idle' | 'authorising' | 'challenge'>('idle');
  const [touched, setTouched] = React.useState(false);
  const [pendingOrder, setPendingOrder] = React.useState<CreatePaymentIntentResponse | null>(null);

  const cardOk = luhn(card);
  const expiryOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
  const cvcOk = /^\d{3,4}$/.test(cvc);
  const cardFormOk = cardOk && expiryOk && cvcOk && nameOnCard.trim().length > 1;

  const finish = async (order: CreatePaymentIntentResponse, outcome: 'succeeded' | 'declined') => {
    try {
      await confirmDemoPayment({ orderId: order.orderId, orderKey: order.orderKey, outcome, method });
      window.location.assign(returnUrl(order));
    } catch (err) {
      if (err instanceof CartClientError && err.status === 402) {
        onError('Your card was declined. No money has been taken — try another card or payment method.');
      } else {
        onError(friendlyCartError(err));
      }
      setBusy('idle');
    }
  };

  const pay = async () => {
    setTouched(true);
    if (method === 'card' && !cardFormOk) {
      onError('Check the card details: number, expiry, security code and the name on the card.');
      return;
    }
    setBusy('authorising');
    try {
      const order = await prepare();
      if (!order) {
        setBusy('idle');
        return;
      }
      setPendingOrder(order);
      const digits = card.replace(/\D/g, '');
      if (method === 'card' && digits === '4000002500003155') {
        setBusy('challenge'); // pretend 3-D Secure: the shopper confirms in the "bank" panel below
        return;
      }
      await finish(order, method === 'card' && digits === '4000000000000002' ? 'declined' : 'succeeded');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy('idle');
    }
  };

  const walletLabel =
    method === 'applepay' ? (
      <>
        Pay with <ApplePayMark className="h-7 text-white" />
      </>
    ) : method === 'googlepay' ? (
      <>
        Pay with <GooglePayMark className="h-6 text-white" />
      </>
    ) : method === 'paypal' ? (
      <>
        <PayPalMark className="h-5 w-5" /> Pay with PayPal
      </>
    ) : method === 'klarna' ? (
      <>
        <KlarnaMark inverted /> Continue with Klarna
      </>
    ) : (
      `Pay ${formatPrice(amount)}`
    );

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
        <strong>Demo payment.</strong> Nothing is charged and no order is created. Test cards: 4242 4242 4242 4242 pays · 4000 0000 0000 0002 declines · 4000 0025 0000 3155 asks for 3-D Secure.
      </p>

      <div role="tablist" aria-label="Payment method" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={method === m.id}
            onClick={() => setMethod(m.id)}
            disabled={busy !== 'idle'}
            className={cn(
              'flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors duration-150',
              method === m.id ? 'border-near-black bg-white ring-1 ring-near-black' : 'border-black/10 bg-[#f7f7f7] hover:border-black/30',
            )}
          >
            <span className="flex h-5 items-center">{MARK[m.id]}</span>
            <span className="mt-1.5 text-sm font-semibold text-near-black">{m.label}</span>
            {m.id === 'card' ? (
              <span className="mt-1 flex items-center gap-1.5" aria-label={m.hint}>
                <VisaMark className="h-3" />
                <MastercardMark className="h-3.5" />
                <AmexMark className="h-3.5" />
              </span>
            ) : (
              <span className="text-[11px] text-charcoal/60">{m.hint}</span>
            )}
          </button>
        ))}
      </div>

      {method === 'card' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="demo-card" className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">Card number</label>
            <input id="demo-card" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card} onChange={(e) => setCard(formatCard(e.target.value))} aria-invalid={touched && !cardOk ? true : undefined} className={cn(FIELD, 'mt-1.5 font-mono tracking-wide')} />
          </div>
          <div>
            <label htmlFor="demo-exp" className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">Expiry</label>
            <input id="demo-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} aria-invalid={touched && !expiryOk ? true : undefined} className={cn(FIELD, 'mt-1.5')} />
          </div>
          <div>
            <label htmlFor="demo-cvc" className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">Security code</label>
            <input id="demo-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={touched && !cvcOk ? true : undefined} className={cn(FIELD, 'mt-1.5')} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="demo-name" className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">Name on card</label>
            <input id="demo-name" autoComplete="cc-name" value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} aria-invalid={touched && nameOnCard.trim().length < 2 ? true : undefined} className={cn(FIELD, 'mt-1.5')} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-black/15 bg-[#f7f7f7] p-4 text-sm text-charcoal/75">
          {method === 'paypal' && 'You will be sent to PayPal to approve the payment, then brought back here.'}
          {method === 'klarna' && 'Klarna splits the total into three interest-free payments. You will confirm with Klarna, then come back here.'}
          {(method === 'applepay' || method === 'googlepay') && 'The wallet sheet opens on your device; confirm with Face ID, Touch ID or your fingerprint.'}
          <span className="mt-1 block text-xs text-charcoal/55">In demo mode this step is simulated and succeeds.</span>
        </div>
      )}

      {busy === 'challenge' && pendingOrder && (
        <div role="dialog" aria-label="Bank verification (demo)" className="rounded-xl border border-near-black bg-white p-4 shadow-lg">
          <p className="text-sm font-semibold text-near-black">Your bank wants to check it&rsquo;s you</p>
          <p className="mt-1 text-xs text-charcoal/70">Demo of a 3-D Secure challenge: a real bank would send a code to your phone or app.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void finish(pendingOrder, 'succeeded')} className="inline-flex h-10 items-center rounded-lg bg-near-black px-4 text-sm font-semibold text-white hover:bg-charcoal">Approve</button>
            <button type="button" onClick={() => void finish(pendingOrder, 'declined')} className="inline-flex h-10 items-center rounded-lg border border-black/15 px-4 text-sm font-semibold text-near-black hover:border-black/40">Decline</button>
          </div>
        </div>
      )}

      {children}

      <button
        type="button"
        onClick={() => void pay()}
        disabled={disabled || busy !== 'idle'}
        className={cn(
          'inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50',
          BUTTON[method],
        )}
      >
        {busy !== 'idle' && <Spinner />}
        {busy === 'authorising' ? 'Authorising…' : busy === 'challenge' ? 'Waiting for your bank…' : walletLabel}
      </button>
      <p className="text-center text-xs text-charcoal/60">Total to pay {formatPrice(amount)} including VAT and delivery.</p>
    </div>
  );
}
