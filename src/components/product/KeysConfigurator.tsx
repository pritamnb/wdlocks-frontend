'use client';

import * as React from 'react';
import Image from 'next/image';
import type { WooProduct } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DeliveryPromise } from '@/components/product/DeliveryPromise';
import { useCart } from '@/hooks/useCart';
import { fetchCart } from '@/lib/cart-client';
import { buildCheckoutUrl, canCheckout } from '@/lib/checkout';
import { decodeEntities, formatPrice } from '@/lib/wdlocks-api';
import { BRAND_RENDERS, PRODUCT_IDS } from '@/lib/constants';
import { cn } from '@/lib/cn';

const QUANTITIES = [1, 2, 3, 4, 5, 6];
/** Letters and digits, 4–12 characters, as stamped on the key bow / key tag. Confirm the exact Watchdog format with the client. */
const KEY_NUMBER_RE = /^[A-Z0-9-]{4,12}$/i;

/**
 * Ultion "Get Keys" flow for the Watchdog extra-keys products: quantity chips (3 preselected), key number,
 * then buy. The 3 Star keys (4266) need the key number as a WooCommerce product field that the Store API
 * cannot set, so that product continues to the wdlocks.co.uk product page carrying quantity and key number.
 */
export function KeysConfigurator({ product }: { product: WooProduct }) {
  const { addToCart, isAdding, openCart, clearCart } = useCart();
  const [qty, setQty] = React.useState(3);
  const [keyNumber, setKeyNumber] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [priced, setPriced] = React.useState(false);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const helpRef = React.useRef<HTMLButtonElement>(null);

  const name = decodeEntities(product.name);
  const unit = Number.parseInt(product.prices.price, 10);
  const total = unit * qty;
  const needsKeyNumber = product.id === PRODUCT_IDS.EXTRA_KEYS_3;
  const keyValid = KEY_NUMBER_RE.test(keyNumber.trim());
  const keyError = touched && needsKeyNumber && !keyValid;

  const continueUrl = React.useMemo(() => {
    const u = new URL(product.permalink);
    u.searchParams.set('quantity', String(qty));
    if (keyNumber.trim()) u.searchParams.set('key_number', keyNumber.trim().toUpperCase());
    u.searchParams.set('utm_source', 'headless');
    return u.toString();
  }, [product.permalink, qty, keyNumber]);

  const getPrice = () => {
    setTouched(true);
    if (needsKeyNumber && !keyValid) return;
    try {
      window.sessionStorage.setItem('wd:key-number', keyNumber.trim().toUpperCase());
    } catch {
      /* ignore */
    }
    setPriced(true);
  };

  const addNative = async (openDrawer: boolean) => addToCart({ id: product.id, quantity: qty, name, openDrawer });

  const checkoutNow = async () => {
    setCheckingOut(true);
    try {
      const ok = await addNative(false);
      if (!ok) return;
      const cart = await fetchCart();
      if (!canCheckout(cart).ok) {
        openCart();
        return;
      }
      const url = buildCheckoutUrl(cart);
      await clearCart();
      window.location.assign(url);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-near-black">How many keys do you need?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Number of keys">
          {QUANTITIES.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={qty === n}
              onClick={() => { setQty(n); setPriced(false); }}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-150',
                qty === n ? 'border-red bg-red text-white' : 'border-cream-dark bg-warm-white text-near-black hover:border-charcoal/50',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-red">Note: we recommend ordering enough keys to leave a spare.</p>
      </fieldset>

      {needsKeyNumber && (
        <div>
          <label htmlFor="key-number" className="mb-2 block text-sm font-semibold text-near-black">
            What&rsquo;s your key number? <span className="font-normal text-charcoal/70">(stamped on your current key)</span>
          </label>
          <input
            id="key-number"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. WD4K7Q2"
            value={keyNumber}
            onChange={(e) => { setKeyNumber(e.target.value); setPriced(false); }}
            onBlur={() => setTouched(true)}
            aria-invalid={keyError || undefined}
            aria-describedby={keyError ? 'key-number-error' : 'key-number-help'}
            className={cn(
              'h-12 w-full rounded-xl border bg-warm-white px-4 text-sm font-semibold uppercase tracking-wide text-near-black placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-red/30',
              keyError ? 'border-red' : 'border-cream-dark focus:border-red',
            )}
          />
          {keyError ? (
            <p id="key-number-error" role="alert" className="mt-2 text-sm font-medium text-red">Enter the 4–12 character number stamped on your key.</p>
          ) : (
            <p id="key-number-help" className="mt-2 text-xs text-charcoal/75">
              <button ref={helpRef} type="button" onClick={() => setShowHelp(true)} className="font-medium text-red underline-offset-2 hover:underline">Where is my key number?</button>
            </p>
          )}
        </div>
      )}

      {needsKeyNumber ? (
        <div className="space-y-3">
          {!priced ? (
            <Button size="lg" className="w-full" onClick={getPrice}>
              Get price and buy
            </Button>
          ) : (
            <div className="rounded-2xl border border-cream-dark bg-cream p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-charcoal/80">{qty} × {name}</p>
                <p className="font-playfair text-2xl font-semibold text-near-black">{formatPrice(total)}</p>
              </div>
              <p className="mt-1 text-xs text-charcoal/70">Key number <span className="font-semibold uppercase text-near-black">{keyNumber.trim()}</span> · prices include VAT</p>
              <a
                href={continueUrl}
                rel="noopener"
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep"
              >
                Continue to secure checkout <span aria-hidden="true">↗</span>
              </a>
              <p className="mt-2 text-xs text-charcoal/70">Keys cut to a key number are finished on wdlocks.co.uk, where you confirm the number and pay.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" variant="secondary" onClick={() => void addNative(true)} loading={isAdding && !checkingOut} disabled={!product.is_in_stock}>
            Add to basket
          </Button>
          <Button size="lg" onClick={() => void checkoutNow()} loading={checkingOut} disabled={!product.is_in_stock}>
            Checkout now <span aria-hidden="true" className="opacity-70">·</span> {formatPrice(total)}
          </Button>
        </div>
      )}

      <DeliveryPromise />

      <Modal open={showHelp} onClose={() => setShowHelp(false)} labelledBy="key-number-help-title" variant="center" returnFocusTo={helpRef} className="rounded-[1.5rem] p-6">
        <h2 id="key-number-help-title" className="font-playfair text-xl font-semibold text-near-black">Where is my key number?</h2>
        <div className="relative mt-4 h-56 w-full">
          <Image src={BRAND_RENDERS.keySingle.src} alt={BRAND_RENDERS.keySingle.alt} fill sizes="400px" className="object-contain" />
        </div>
        <ul className="mt-4 space-y-2 text-sm text-charcoal/85">
          <li>On the bow of every Watchdog key, under the Stays Locked mark.</li>
          <li>On the key tag that came with your lock.</li>
          <li>In your guarantee registration email, if you have registered.</li>
        </ul>
        <p className="mt-4 text-xs text-charcoal/70">Can&rsquo;t find it? Call 0203 857 4718 and we will look it up from your order.</p>
        <button type="button" onClick={() => setShowHelp(false)} className="mt-5 inline-flex h-10 items-center rounded-full bg-near-black px-5 text-sm font-semibold text-white hover:bg-red">Close</button>
      </Modal>
    </div>
  );
}
