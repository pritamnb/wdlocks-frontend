'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressFields } from '@/components/checkout/AddressFields';
import { ShippingOptions } from '@/components/checkout/ShippingOptions';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/Toast';
import { updateCustomer, selectShippingRate, applyCoupon, removeCoupon, createPaymentIntent, friendlyCartError } from '@/lib/cart-client';
import { buildCheckoutUrl, canCheckout } from '@/lib/checkout';
import { EMAIL, EMPTY_ADDRESS, FIELD, isAddressComplete, toApiAddress, validateAddress, type AddressForm } from '@/lib/checkout-form';
import { isOptimisticKey } from '@/lib/cart-optimistic';
import { estimateDelivery, formatCountdown, formatDeliveryDate } from '@/lib/delivery';
import { CHECKOUT_MODE, SITE } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { CreatePaymentIntentResponse } from '@/types';

const StripePayment = dynamic(() => import('@/components/checkout/StripePayment').then((m) => m.StripePayment), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
});

const LABEL = 'text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70';
const STORAGE_KEY = 'wd:checkout-form';

interface Saved {
  email: string;
  phone: string;
  shipping: AddressForm;
  billingSame: boolean;
  billing: AddressForm;
}

/**
 * Checkout on our own domain (Ultion pattern: one page, details on the left, order summary on the right).
 * Address and delivery choices are saved to the WooCommerce basket as the shopper types, so the totals on the right
 * are always the live Store API figures. Payment is Stripe (cards, Apple Pay, Google Pay, Klarna, Clearpay, PayPal as
 * enabled in the client's Dashboard) when the publishable key is configured; otherwise the page runs in preview mode
 * and the final step hands the basket to wdlocks.co.uk as before.
 */
export function CheckoutPage({ preview = false }: { preview?: boolean }) {
  const { cart, status, error, pendingKeys, updateCartItem, removeCartItem, refresh, replaceCart, clearCart } = useCart();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [shipping, setShipping] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [billingSame, setBillingSame] = React.useState(true);
  const [billing, setBilling] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [note, setNote] = React.useState('');
  const [showNote, setShowNote] = React.useState(false);
  const [terms, setTerms] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [savingAddress, setSavingAddress] = React.useState(false);
  const [savingRate, setSavingRate] = React.useState(false);
  const [couponPending, setCouponPending] = React.useState(false);
  const [handingOff, setHandingOff] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);
  const isClient = React.useSyncExternalStore(() => () => {}, () => true, () => false);
  const now = isClient ? new Date() : null;
  const est = now ? estimateDelivery(now) : null;

  // Restore what the shopper typed if they come back (sessionStorage only, cleared on success).
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Saved>;
      queueMicrotask(() => {
        if (saved.email) setEmail(saved.email);
        if (saved.phone) setPhone(saved.phone);
        if (saved.shipping) setShipping({ ...EMPTY_ADDRESS, ...saved.shipping, country: 'GB' });
        if (typeof saved.billingSame === 'boolean') setBillingSame(saved.billingSame);
        if (saved.billing) setBilling({ ...EMPTY_ADDRESS, ...saved.billing, country: 'GB' });
      });
    } catch {
      /* ignore */
    }
  }, []);
  React.useEffect(() => {
    try {
      const data: Saved = { email, phone, shipping, billingSame, billing };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [email, phone, shipping, billingSame, billing]);

  // Save the address to the basket (debounced) once it is complete: the Store API recalculates delivery rates/VAT.
  const shippingErrors = validateAddress(shipping);
  const billingErrors = billingSame ? {} : validateAddress(billing);
  const emailOk = EMAIL.test(email.trim());
  const phoneOk = phone.trim().length >= 7;
  const addressReady = isAddressComplete(shipping) && (billingSame || isAddressComplete(billing));
  const savedSignature = React.useRef('');
  const signature = JSON.stringify([toApiAddress(shipping), billingSame ? null : toApiAddress(billing), emailOk ? email.trim() : '', phoneOk ? phone.trim() : '']);
  React.useEffect(() => {
    if (!addressReady || !cart || cart.items.length === 0) return;
    if (signature === savedSignature.current) return;
    const timer = setTimeout(async () => {
      savedSignature.current = signature;
      setSavingAddress(true);
      try {
        const contact = { email: emailOk ? email : '', phone: phoneOk ? phone : '' };
        const next = await updateCustomer({
          billing_address: toApiAddress(billingSame ? shipping : billing, contact),
          shipping_address: toApiAddress(shipping, { email: '', phone: contact.phone }),
        });
        replaceCart(next);
      } catch (err) {
        savedSignature.current = '';
        toast({ type: 'error', message: friendlyCartError(err) });
      } finally {
        setSavingAddress(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [signature, addressReady, cart, billingSame, shipping, billing, email, phone, emailOk, phoneOk, replaceCart, toast]);

  const onSelectRate = async (packageId: number, rateId: string) => {
    setSavingRate(true);
    try {
      replaceCart(await selectShippingRate({ package_id: packageId, rate_id: rateId }));
    } catch (err) {
      toast({ type: 'error', message: friendlyCartError(err) });
    } finally {
      setSavingRate(false);
    }
  };

  const onCoupon = (apply: boolean) => async (code: string) => {
    setCouponPending(true);
    try {
      replaceCart(apply ? await applyCoupon({ code }) : await removeCoupon({ code }));
      toast({ type: 'success', message: apply ? 'Coupon applied' : 'Coupon removed' });
      return true;
    } catch (err) {
      toast({ type: 'error', message: friendlyCartError(err) });
      return false;
    } finally {
      setCouponPending(false);
    }
  };

  const items = cart?.items ?? [];
  const busyLines = Array.from(pendingKeys).length > 0 || items.some((i) => isOptimisticKey(i.key));
  const selectedRate = cart?.shipping_rates[0]?.shipping_rates.find((r) => r.selected) ?? null;
  const total = cart ? Number.parseInt(cart.totals.total_price, 10) || 0 : 0;
  const formValid = emailOk && phoneOk && addressReady && terms && (!cart?.needs_shipping || !!selectedRate);

  /** Shared gate for both payment paths: show errors and refuse until the form is complete. */
  const validate = (): boolean => {
    setShowErrors(true);
    setPayError(null);
    if (!formValid) {
      setPayError(!terms ? 'Please accept the terms and conditions to continue.' : 'Please complete the highlighted fields.');
      return false;
    }
    return true;
  };

  const prepare = React.useCallback(async (): Promise<CreatePaymentIntentResponse | null> => {
    if (!cart) return null;
    const contact = { email: email.trim(), phone: phone.trim() };
    return createPaymentIntent({
      billing_address: toApiAddress(billingSame ? shipping : billing, contact),
      shipping_address: toApiAddress(shipping, { email: '', phone: contact.phone }),
      customer_note: note.trim() || undefined,
      expected_total: cart.totals.total_price,
    });
  }, [cart, email, phone, billingSame, shipping, billing, note]);

  const returnUrl = React.useCallback((order: CreatePaymentIntentResponse) => {
    const u = new URL('/checkout/return', window.location.origin);
    u.searchParams.set('order', String(order.orderId));
    u.searchParams.set('key', order.orderKey);
    return u.toString();
  }, []);

  const handoff = async () => {
    if (!cart || !validate()) return;
    const gate = canCheckout(cart);
    if (!gate.ok) {
      setPayError(gate.reason ?? 'Please review your basket.');
      return;
    }
    setHandingOff(true);
    const url = buildCheckoutUrl(cart);
    await clearCart();
    window.location.assign(url);
  };

  const billingDetails = React.useMemo(() => {
    const a = billingSame ? shipping : billing;
    return {
      name: `${a.first_name} ${a.last_name}`.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: { line1: a.address_1, line2: a.address_2 || undefined, city: a.city, state: a.state || undefined, postal_code: a.postcode, country: 'GB' as const },
    };
  }, [billingSame, shipping, billing, email, phone]);

  if (status === 'loading' && !cart) {
    return (
      <div className="container-wd py-10 sm:py-14">
        <h1 className="heading-display text-3xl sm:text-4xl">Checkout</h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-96 rounded-2xl lg:col-span-7" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-5" />
        </div>
      </div>
    );
  }
  if (status === 'error' && !cart) {
    return (
      <div className="container-wd py-10 sm:py-14">
        <h1 className="heading-display text-3xl sm:text-4xl">Checkout</h1>
        <div role="alert" className="mt-8 rounded-2xl border border-black/10 bg-[#f7f7f7] p-8 text-center">
          <p className="text-sm text-charcoal/80">{error ?? 'We couldn’t load your basket.'}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refresh()}>Try again</Button>
        </div>
      </div>
    );
  }
  if (!cart || items.length === 0) {
    return (
      <div className="container-wd py-10 sm:py-14">
        <h1 className="heading-display text-3xl sm:text-4xl">Checkout</h1>
        <div className="mt-8 rounded-2xl border border-black/10 bg-[#f7f7f7] p-12 text-center">
          <p className="font-playfair text-xl font-semibold text-near-black">Nothing to check out yet.</p>
          <ButtonLink href="/#products" size="lg" className="mt-6">Choose a lock</ButtonLink>
        </div>
      </div>
    );
  }

  const stripeLive = CHECKOUT_MODE === 'stripe';

  return (
    <div className="container-wd py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading-display text-3xl sm:text-4xl">Checkout</h1>
        <p className="text-sm text-charcoal/70">
          <span aria-hidden="true">🔒</span> Secure checkout · UK delivery · <Link href="/basket" className="font-medium text-near-black underline-offset-2 hover:text-red hover:underline">Edit basket</Link>
        </p>
      </div>
      {preview && !stripeLive && (
        <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Preview of the on-site checkout. Address, delivery and coupons are live; card payment appears here once the Stripe keys are added, until then the last step pays on wdlocks.co.uk.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-12">
        {/* The summary's coupon form must not nest inside this form (browsers drop nested forms). */}
        <form className="space-y-8 lg:col-span-7" onSubmit={(e) => e.preventDefault()} noValidate>
          {/* 1 Contact */}
          <section aria-labelledby="co-contact">
            <h2 id="co-contact" className="flex items-center gap-3 text-lg font-semibold text-near-black">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-near-black text-xs font-semibold text-white" aria-hidden="true">1</span>
              Contact
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="co-email" className={LABEL}>Email</label>
                <input id="co-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={showErrors && !emailOk ? true : undefined} className={cn(FIELD, 'mt-1.5')} placeholder="For your order confirmation" />
                {showErrors && !emailOk && <p className="mt-1 text-xs font-medium text-red">Enter a valid email address</p>}
              </div>
              <div>
                <label htmlFor="co-phone" className={LABEL}>Phone</label>
                <input id="co-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required aria-invalid={showErrors && !phoneOk ? true : undefined} className={cn(FIELD, 'mt-1.5')} placeholder="For delivery updates" />
                {showErrors && !phoneOk && <p className="mt-1 text-xs font-medium text-red">Enter a phone number</p>}
              </div>
            </div>
          </section>

          {/* 2 Delivery address */}
          <section aria-labelledby="co-address">
            <h2 id="co-address" className="flex items-center gap-3 text-lg font-semibold text-near-black">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-near-black text-xs font-semibold text-white" aria-hidden="true">2</span>
              Delivery address
              {savingAddress && <span className="text-xs font-normal text-charcoal/60">Saving…</span>}
            </h2>
            <div className="mt-4">
              <AddressFields idPrefix="ship" section="shipping" value={shipping} errors={shippingErrors} showErrors={showErrors} onChange={setShipping} />
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-near-black">
              <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} className="h-4 w-4 accent-red" />
              Billing address is the same as delivery
            </label>
            {!billingSame && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-[#f7f7f7] p-4 sm:p-5">
                <p className="text-sm font-semibold text-near-black">Billing address</p>
                <div className="mt-3">
                  <AddressFields idPrefix="bill" section="billing" value={billing} errors={billingErrors} showErrors={showErrors} onChange={setBilling} />
                </div>
              </div>
            )}
          </section>

          {/* 3 Delivery method */}
          <section aria-labelledby="co-delivery">
            <h2 id="co-delivery" className="flex items-center gap-3 text-lg font-semibold text-near-black">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-near-black text-xs font-semibold text-white" aria-hidden="true">3</span>
              Delivery method
            </h2>
            <p className="mt-1 text-sm text-charcoal/70">
              {est?.shipsToday ? `Order within ${formatCountdown(est.minutesToCutoff)} and we dispatch today.` : est ? `Dispatched ${formatDeliveryDate(est.dispatchDate)}.` : `Orders before ${SITE.dispatchCutoff} Monday to Friday are dispatched the same day.`}
            </p>
            <div className="mt-4">
              <ShippingOptions packages={cart.shipping_rates} pending={savingRate || savingAddress} onSelect={(p, r) => void onSelectRate(p, r)} now={now} />
            </div>
            {showErrors && cart.needs_shipping && !selectedRate && <p className="mt-2 text-xs font-medium text-red">Choose a delivery method</p>}
            <div className="mt-4">
              {!showNote ? (
                <button type="button" onClick={() => setShowNote(true)} className="text-sm font-medium text-near-black underline-offset-2 hover:text-red hover:underline">
                  Add a delivery note
                </button>
              ) : (
                <div>
                  <label htmlFor="co-note" className={LABEL}>Order notes <span className="font-normal normal-case tracking-normal text-charcoal/50">(optional)</span></label>
                  <textarea id="co-note" name="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={cn(FIELD, 'mt-1.5')} placeholder="Notes about your order, e.g. where to leave the parcel." />
                </div>
              )}
            </div>
          </section>

          {/* 4 Payment */}
          <section aria-labelledby="co-payment">
            <h2 id="co-payment" className="flex items-center gap-3 text-lg font-semibold text-near-black">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-near-black text-xs font-semibold text-white" aria-hidden="true">4</span>
              Payment
            </h2>
            <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
              {payError && (
                <p role="alert" className="mb-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-charcoal">
                  {payError}
                </p>
              )}
              {stripeLive ? (
                <StripePayment
                  amount={total}
                  prepare={async () => (validate() ? prepare() : null)}
                  returnUrl={returnUrl}
                  billingDetails={billingDetails}
                  disabled={busyLines || savingAddress || savingRate}
                  onError={(m) => setPayError(m)}
                >
                  <TermsCheckbox checked={terms} onChange={setTerms} invalid={showErrors && !terms} />
                </StripePayment>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#f7f7f7] p-4 text-sm text-charcoal/80">
                    <p className="font-semibold text-near-black">Pay securely on wdlocks.co.uk</p>
                    <p className="mt-1">Visa, Mastercard, American Express, Google Pay and PayPal. Your basket goes with you.</p>
                    <ul className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-charcoal/70">
                      {['Visa', 'Mastercard', 'Amex', 'Google Pay', 'PayPal'].map((m) => (
                        <li key={m} className="rounded-md border border-black/10 bg-white px-2.5 py-1">{m}</li>
                      ))}
                    </ul>
                  </div>
                  <TermsCheckbox checked={terms} onChange={setTerms} invalid={showErrors && !terms} />
                  <Button size="lg" className="h-14 w-full rounded-xl text-base" onClick={() => void handoff()} loading={handingOff} disabled={busyLines || savingAddress}>
                    Continue to secure payment
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </Button>
                </div>
              )}
              <p className="mt-4 text-center text-xs text-charcoal/65">
                Your personal data is used to process your order and support your experience, as described in our{' '}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-red">privacy policy</Link>.
              </p>
            </div>
          </section>
        </form>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <OrderSummary cart={cart} pendingKeys={pendingKeys} onQuantity={(k, q) => void updateCartItem(k, q)} onRemove={(k) => void removeCartItem(k)} onApplyCoupon={onCoupon(true)} onRemoveCoupon={onCoupon(false)} couponPending={couponPending} />
            <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-charcoal/75">
              <li className="rounded-lg bg-[#f7f7f7] px-2 py-2">🔒 Secure checkout</li>
              <li className="rounded-lg bg-[#f7f7f7] px-2 py-2">📦 Same-day dispatch</li>
              <li className="rounded-lg bg-[#f7f7f7] px-2 py-2">🛡️ £5,000 guarantee</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TermsCheckbox({ checked, onChange, invalid }: { checked: boolean; onChange: (v: boolean) => void; invalid: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-near-black', invalid && 'text-red')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required aria-invalid={invalid || undefined} className="mt-0.5 h-4 w-4 accent-red" />
      <span>
        I have read and agree to the website{' '}
        <Link href="/terms" target="_blank" className="font-medium underline underline-offset-2 hover:text-red">terms and conditions</Link>
        <span aria-hidden="true"> *</span>
      </span>
    </label>
  );
}
