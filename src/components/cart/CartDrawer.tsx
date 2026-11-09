'use client';

import * as React from 'react';
import { Modal, CloseButton } from '@/components/ui/Modal';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/wdlocks-api';
import { buildCheckoutUrl, canCheckout } from '@/lib/checkout';
import { SITE } from '@/lib/constants';

export function CartDrawer() {
  const { cart, status, error, isOpen, closeCart, itemCount, subtotalPence, pendingKeys, updateCartItem, removeCartItem, refresh, clearCart } = useCart();
  const [checkingOut, setCheckingOut] = React.useState(false);
  const items = cart?.items ?? [];
  const checkout = canCheckout(cart);

  // If the shopper comes back via bfcache / back button, re-enable the button.
  React.useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setCheckingOut(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const goToCheckout = async () => {
    if (!cart || !checkout.ok) return;
    setCheckingOut(true);
    const url = buildCheckoutUrl(cart); // snapshot the lines BEFORE clearing
    // The WooCommerce checkout now owns the basket: empty ours so a returning shopper can't re-send it.
    await clearCart();
    window.location.assign(url);
  };

  return (
    <Modal open={isOpen} onClose={closeCart} variant="right" labelledBy="cart-title" className="flex flex-col">
      <div className="flex items-center justify-between border-b border-cream-dark px-5 py-4">
        <h2 id="cart-title" className="font-playfair text-xl font-semibold text-near-black">
          Your basket
          <span className="ml-2 text-sm font-normal text-charcoal/75" aria-live="polite">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </h2>
        <CloseButton onClick={closeCart} label="Close basket" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 scrollbar-thin">
        {status === 'loading' && !cart ? (
          <ul className="divide-y divide-cream-dark">
            {[0, 1].map((i) => (
              <li key={i} className="flex gap-4 py-4">
                <Skeleton className="h-20 w-20 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="mt-4 h-8 w-24 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : status === 'error' && !cart ? (
          <div role="alert" className="py-12 text-center">
            <p className="text-sm text-charcoal/80">{error ?? 'We couldn’t load your basket.'}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <span aria-hidden="true" className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream text-2xl">🧺</span>
            <p className="font-playfair text-lg font-semibold text-near-black">Your basket is empty</p>
            <p className="mt-1 text-sm text-charcoal/70">Every lock ships with 3 keys as standard.</p>
            <ButtonLink href="/products" variant="dark" size="md" className="mt-6" onClick={closeCart}>
              Shop locks
            </ButtonLink>
          </div>
        ) : (
          <ul className="divide-y divide-cream-dark">
            {items.map((item) => (
              <CartLineItem
                key={item.key}
                item={item}
                pending={pendingKeys.has(item.key)}
                onQuantity={(key, qty) => void updateCartItem(key, qty)}
                onRemove={(key) => void removeCartItem(key)}
                onNavigate={closeCart}
              />
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-cream-dark bg-warm-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {!checkout.ok && (
            <div role="alert" className="mb-3 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-xs text-charcoal">
              {checkout.reason}{' '}
              <a href={SITE.phoneHref} className="font-semibold text-near-black hover:text-red">{SITE.phone}</a>
            </div>
          )}
          <dl className="flex items-baseline justify-between">
            <dt className="text-sm text-charcoal/80">Subtotal <span className="text-xs">(inc. VAT)</span></dt>
            <dd className="font-playfair text-2xl font-semibold tabular-nums text-near-black">{formatPrice(subtotalPence)}</dd>
          </dl>
          <p className="mt-1 text-xs text-charcoal/75">Royal Mail tracked delivery, calculated at checkout.</p>
          <Button size="lg" className="mt-4 w-full" onClick={() => void goToCheckout()} loading={checkingOut} disabled={pendingKeys.size > 0 || !checkout.ok}>
            Checkout securely
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </Button>
          <button type="button" onClick={closeCart} className="mt-3 w-full text-center text-sm font-medium text-charcoal/70 transition-colors duration-150 hover:text-red">
            Continue shopping
          </button>
        </div>
      )}
    </Modal>
  );
}
