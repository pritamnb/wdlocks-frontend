'use client';

import * as React from 'react';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { CreatePaymentIntentResponse } from '@/types';
import { Spinner } from '@/components/ui/Button';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/constants';
import { friendlyCartError, CartClientError } from '@/lib/cart-client';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

export interface StripePaymentProps {
  /** Minor units; keeps the Elements amount in sync with the basket total. */
  amount: number;
  /** Runs validation, creates the WooCommerce order + PaymentIntent and returns the client secret. Return null to abort. */
  prepare: () => Promise<CreatePaymentIntentResponse | null>;
  /** Where Stripe sends the shopper back after a redirect method (Klarna, PayPal…) or 3-D Secure. */
  returnUrl: (order: CreatePaymentIntentResponse) => string;
  billingDetails: { name: string; email: string; phone: string; address: { line1: string; line2?: string; city: string; state?: string; postal_code: string; country: 'GB' } };
  disabled: boolean;
  onError: (message: string) => void;
  children?: React.ReactNode;
}

const appearance: StripeElementsOptions['appearance'] = {
  theme: 'stripe',
  variables: { colorPrimary: '#1b1a1c', colorText: '#1b1a1c', colorDanger: '#da1519', fontFamily: 'Outfit, system-ui, sans-serif', borderRadius: '12px', spacingUnit: '4px' },
};

/**
 * Stripe Payment Element (cards, Klarna, Clearpay, PayPal, Link as enabled in the client's Stripe Dashboard) plus the
 * Express Checkout Element (Apple Pay / Google Pay). Deferred-intent flow: Elements is created with the amount; the
 * PaymentIntent (and the WooCommerce order) are created only when the shopper confirms.
 */
export function StripePayment(props: StripePaymentProps) {
  const options: StripeElementsOptions = React.useMemo(
    () => ({ mode: 'payment', amount: Math.max(props.amount, 50), currency: 'gbp', appearance, paymentMethodCreation: 'manual', fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap' }] }),
    [props.amount],
  );
  return (
    <Elements stripe={getStripePromise()} options={options}>
      <PaymentForm {...props} />
    </Elements>
  );
}

function PaymentForm({ prepare, returnUrl, billingDetails, disabled, onError, children }: StripePaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = React.useState(false);
  const [elementReady, setElementReady] = React.useState(false);

  const confirm = React.useCallback(async () => {
    if (!stripe || !elements || busy) return;
    setBusy(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? 'Please check your payment details.');
        return;
      }
      const order = await prepare();
      if (!order) return;
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: order.clientSecret,
        confirmParams: { return_url: returnUrl(order), payment_method_data: { billing_details: billingDetails } },
        redirect: 'if_required',
      });
      if (error) {
        onError(error.message ?? 'Your payment could not be taken. Please try another method.');
        return;
      }
      // No redirect was needed (card without 3DS, wallet): the intent is confirmed — go to the return page to finish.
      window.location.assign(returnUrl(order));
    } catch (err) {
      onError(err instanceof CartClientError ? friendlyCartError(err) : err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [stripe, elements, busy, prepare, returnUrl, billingDetails, onError]);

  return (
    <div className="space-y-4">
      <ExpressCheckoutElement
        onConfirm={() => void confirm()}
        options={{ buttonHeight: 48, buttonType: { applePay: 'buy', googlePay: 'buy' } }}
      />
      <PaymentElement onReady={() => setElementReady(true)} options={{ layout: 'tabs' }} />
      {children}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={disabled || busy || !elementReady}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red text-base font-semibold text-white transition-colors duration-300 hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && <Spinner />}
        {busy ? 'Processing…' : 'Place order'}
      </button>
    </div>
  );
}
