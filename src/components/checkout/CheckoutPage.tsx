'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressFields } from '@/components/checkout/AddressFields';
import { ShippingOptions } from '@/components/checkout/ShippingOptions';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PromoCode } from '@/components/checkout/PromoCode';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/Toast';
import { createPaymentIntent, checkPromoCode, friendlyCartError, CartClientError } from '@/lib/cart-client';
import { withCoupon } from '@/lib/basket';
import { buildCheckoutUrl, canCheckout } from '@/lib/checkout';
import { EMAIL, EMPTY_ADDRESS, FIELD, isAddressComplete, toApiAddress, validateAddress, type AddressForm } from '@/lib/checkout-form';
import { estimateDelivery, formatCountdown, formatDeliveryDate } from '@/lib/delivery';
import { CHECKOUT_MODE, SHIPPING_OPTIONS, SITE, STRIPE_TEST_MODE } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { CouponQuote, CreatePaymentIntentResponse } from '@/types';

const StripePayment = dynamic(() => import('@/components/checkout/StripePayment').then((m) => m.StripePayment), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
});

const DemoPayment = dynamic(() => import('@/components/checkout/DemoPayment').then((m) => m.DemoPayment), {
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
  /** Applied promo code, re-checked when the shopper comes back. */
  promo?: string;
}

/**
 * Checkout on our own domain (Ultion pattern: one page, details on the left, order summary on the right).
 * Everything on this page is local: the basket, the VAT split and the three Royal Mail options come from
 * src/lib/basket.ts, so the page renders at once and nothing here waits on wdlocks.co.uk. The store is contacted
 * exactly once, when the shopper places the order (POST /api/checkout/intent re-prices every line from the Store API,
 * creates the WooCommerce order and the Stripe PaymentIntent). Payment is Stripe when the publishable key is
 * configured, the demo provider in demo mode; otherwise the page runs in preview mode and hands off to wdlocks.co.uk.
 */
export function CheckoutPage({ preview = false }: { preview?: boolean }) {
  const { cart, status, pendingKeys, updateCartItem, removeCartItem, clearCart, shippingOptionId, setShippingOption, lineInputs, applyPrices } = useCart();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [shipping, setShipping] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [billingSame, setBillingSame] = React.useState(true);
  const [billing, setBilling] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [note, setNote] = React.useState('');
  const [terms, setTerms] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [handingOff, setHandingOff] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);
  /** The promo code WooCommerce accepted, and the basket lines (`sig`) its discount was worked out for. */
  const [promo, setPromo] = React.useState<{ quote: CouponQuote; sig: string } | null>(null);
  const [promoChecking, setPromoChecking] = React.useState(false);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [savedPromo, setSavedPromo] = React.useState('');
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
        if (typeof saved.promo === 'string' && saved.promo) setSavedPromo(saved.promo);
      });
    } catch {
      /* ignore */
    }
  }, []);
  React.useEffect(() => {
    try {
      const data: Saved = { email, phone, shipping, billingSame, billing, promo: promo?.quote.code };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [email, phone, shipping, billingSame, billing, promo]);

  // Promo code: WooCommerce works the discount out for these exact lines, so it is asked again whenever they change.
  const lineSig = React.useMemo(() => JSON.stringify(lineInputs), [lineInputs]);
  const promoRequest = React.useRef(0);
  const applyPromo = React.useCallback(
    async (code: string) => {
      if (lineInputs.length === 0) return;
      const ticket = ++promoRequest.current;
      const sig = lineSig;
      setPromoChecking(true);
      setPromoError(null);
      try {
        const quote = await checkPromoCode(lineInputs, code);
        if (ticket !== promoRequest.current) return;
        setPromo({ quote, sig });
      } catch (err) {
        if (ticket !== promoRequest.current) return;
        setPromo(null);
        setPromoError(err instanceof CartClientError && err.code === 'coupon_invalid' ? err.message : friendlyCartError(err));
      } finally {
        if (ticket === promoRequest.current) setPromoChecking(false);
      }
    },
    [lineInputs, lineSig],
  );
  const removePromo = () => {
    promoRequest.current++;
    setPromo(null);
    setPromoChecking(false);
    setPromoError(null);
    setSavedPromo('');
  };
  React.useEffect(() => {
    if (promo && promo.sig !== lineSig && !promoChecking) queueMicrotask(() => void applyPromo(promo.quote.code));
  }, [promo, lineSig, promoChecking, applyPromo]);
  React.useEffect(() => {
    if (savedPromo && !promo && !promoChecking && !promoError && lineInputs.length > 0) queueMicrotask(() => void applyPromo(savedPromo));
  }, [savedPromo, promo, promoChecking, promoError, lineInputs.length, applyPromo]);
  const pricedCart = React.useMemo(() => (cart && promo && promo.sig === lineSig ? withCoupon(cart, promo.quote) : cart), [cart, promo, lineSig]);

  const shippingErrors = validateAddress(shipping);
  const billingErrors = billingSame ? {} : validateAddress(billing);
  const emailOk = EMAIL.test(email.trim());
  const phoneOk = phone.trim().length >= 7;
  const addressReady = isAddressComplete(shipping) && (billingSame || isAddressComplete(billing));

  const onSelectRate = (_packageId: number, rateId: string) => {
    const option = SHIPPING_OPTIONS.find((o) => o.rateId === rateId);
    if (option) setShippingOption(option.id);
  };

  const items = cart?.items ?? [];
  const selectedRate = cart?.shipping_rates[0]?.shipping_rates.find((r) => r.selected) ?? null;
  const total = pricedCart ? Number.parseInt(pricedCart.totals.total_price, 10) || 0 : 0;
  const formValid = emailOk && phoneOk && addressReady && terms && (!cart?.needs_shipping || !!selectedRate);

  /** Shared gate for both payment paths: show errors and refuse until the form is complete. */
  const validate = (): boolean => {
    setShowErrors(true);
    setPayError(null);
    if (!formValid) {
      setPayError(!terms ? 'Please accept the terms and conditions to continue.' : 'Please complete the highlighted fields.');
      return false;
    }
    if (promoChecking || (promo && promo.sig !== lineSig)) {
      setPayError('One moment: your promo code is being checked.');
      return false;
    }
    return true;
  };

  /**
   * The one call that reaches the store. A 409 means the Store API prices differ from what the basket shows: the
   * server's prices are applied to the basket (so the summary updates) and the shopper is asked to look again.
   */
  const prepare = React.useCallback(async (): Promise<CreatePaymentIntentResponse | null> => {
    if (!pricedCart) return null;
    const contact = { email: email.trim(), phone: phone.trim() };
    try {
      return await createPaymentIntent({
        items: lineInputs,
        shipping_option: shippingOptionId,
        billing_address: toApiAddress(billingSame ? shipping : billing, contact),
        shipping_address: toApiAddress(shipping, { email: '', phone: contact.phone }),
        customer_note: note.trim() || undefined,
        expected_total: pricedCart.totals.total_price,
        ...(promo ? { coupon_code: promo.quote.code } : {}),
      });
    } catch (err) {
      if (err instanceof CartClientError && err.code === 'total_mismatch') {
        const prices = (err.data?.prices ?? null) as Record<string, number> | null;
        if (prices) applyPrices(prices);
        const coupon = (err.data?.coupon ?? null) as CouponQuote | null;
        // The server's own WooCommerce quote replaces ours (same lines, so the same key).
        if (coupon && promo) setPromo({ quote: coupon, sig: lineSig });
        toast({ type: 'info', message: 'Prices were updated from the store. Please check the total and try again.' });
      }
      if (err instanceof CartClientError && err.code === 'coupon_invalid') {
        setPromo(null);
        setSavedPromo('');
        setPromoError(err.message);
      }
      throw err;
    }
  }, [pricedCart, email, phone, billingSame, shipping, billing, note, lineInputs, shippingOptionId, applyPrices, toast, promo, lineSig]);

  const returnUrl = React.useCallback((order: CreatePaymentIntentResponse) => {
    const u = new URL('/checkout/return', window.location.origin);
    u.searchParams.set('order', String(order.orderId));
    u.searchParams.set('key', order.orderKey);
    return u.toString();
  }, []);

  const handoff = async () => {
    if (!cart || !validate()) return;
    const gate = canCheckout(cart, { handoff: true });
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
  const demo = CHECKOUT_MODE === 'demo';
  const onPayError = (m: string) => setPayError(m);

  return (
    <div className="container-wd py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading-display text-3xl sm:text-4xl">Checkout</h1>
        <p className="text-sm text-charcoal/70">
          <span aria-hidden="true">🔒</span> Secure checkout · UK delivery · <Link href="/basket" className="font-medium text-near-black underline-offset-2 hover:text-red hover:underline">Edit basket</Link>
        </p>
      </div>
      {stripeLive && STRIPE_TEST_MODE && (
        <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <strong>Test mode.</strong> This checkout runs on Stripe&rsquo;s test keys: real cards are refused and nothing is charged. Pay with 4242 4242 4242 4242 (any future expiry, any CVC); 4000 0000 0000 0002 is declined and 4000 0025 0000 3155 asks for 3-D Secure.
        </p>
      )}
      {preview && !stripeLive && !demo && (
        <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Preview of the on-site checkout. Card payment appears here once the Stripe keys are added; until then the last step pays on wdlocks.co.uk.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-12">
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
              <ShippingOptions packages={cart.shipping_rates} pending={false} onSelect={onSelectRate} now={now} />
            </div>
            {showErrors && cart.needs_shipping && !selectedRate && <p className="mt-2 text-xs font-medium text-red">Choose a delivery method</p>}
            {/* Always shown (Pritam, 12 Nov: "order notes at payment is missing" — it sat behind an "Add a delivery note"
                link). Sent as customer_note: the WooCommerce order's customer note, or kept on the demo order. */}
            <div className="mt-5">
              <label htmlFor="co-note" className={LABEL}>Order notes <span className="font-normal normal-case tracking-normal text-charcoal/50">(optional)</span></label>
              <textarea id="co-note" name="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={cn(FIELD, 'mt-1.5')} placeholder="Notes about your order, e.g. where to leave the parcel or a safe place." />
            </div>
          </section>

          {/* 4 Payment */}
          <section aria-labelledby="co-payment">
            <h2 id="co-payment" className="flex items-center gap-3 text-lg font-semibold text-near-black">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-near-black text-xs font-semibold text-white" aria-hidden="true">4</span>
              Payment
            </h2>
            <div className="mt-4">
              <PromoCode applied={promo?.quote ?? null} checking={promoChecking} error={promoError} onApply={(c) => void applyPromo(c)} onRemove={removePromo} initialCode={savedPromo} />
            </div>
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
                  disabled={false}
                  onError={onPayError}
                >
                  <TermsCheckbox checked={terms} onChange={setTerms} invalid={showErrors && !terms} />
                </StripePayment>
              ) : demo ? (
                <DemoPayment amount={total} prepare={async () => (validate() ? prepare() : null)} returnUrl={returnUrl} disabled={false} onError={onPayError}>
                  <TermsCheckbox checked={terms} onChange={setTerms} invalid={showErrors && !terms} />
                </DemoPayment>
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
                  <Button size="lg" className="h-14 w-full rounded-xl text-base" onClick={() => void handoff()} loading={handingOff}>
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
            <OrderSummary cart={pricedCart ?? cart} pendingKeys={pendingKeys} onQuantity={(k, q) => void updateCartItem(k, q)} onRemove={(k) => void removeCartItem(k)} />
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
