'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { WooProduct } from '@/types';
import { Modal, CloseButton } from '@/components/ui/Modal';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { DeliveryPromise } from '@/components/product/DeliveryPromise';
import { useCart } from '@/hooks/useCart';
import { formatPrice, decodeEntities } from '@/lib/wdlocks-api';
import { canCheckout } from '@/lib/checkout';
import { CATALOGUE_BY_ID, SITE, UPSELL_PRODUCT_IDS } from '@/lib/constants';

export function CartDrawer({ products = [] }: { products?: WooProduct[] }) {
  const { cart, status, error, isOpen, closeCart, itemCount, subtotalPence, pendingKeys, updateCartItem, removeCartItem, refresh, clearCart, addToCart, isAdding } = useCart();
  const items = cart?.items ?? [];
  const checkout = canCheckout(cart);

  // "Don't forget" upsells: simple products not already in the basket.
  const inCart = new Set(items.map((i) => i.id));
  const upsells = UPSELL_PRODUCT_IDS.map((id) => products.find((p) => p.id === id))
    .filter((p): p is WooProduct => Boolean(p) && !inCart.has(p!.id) && p!.is_in_stock)
    .slice(0, 2);

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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span aria-hidden="true" className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream text-2xl">🧺</span>
            <p className="font-playfair text-lg font-semibold text-near-black">Your basket is empty</p>
            <p className="mt-1 text-sm text-charcoal/75">Every lock ships with 3 keys as standard.</p>
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

        {upsells.length > 0 && (
          <div className="mt-2 mb-4 rounded-2xl border border-cream-dark bg-cream p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/75">Don’t forget</p>
            <ul className="mt-2 space-y-2">
              {upsells.map((p) => {
                const entry = CATALOGUE_BY_ID[p.id];
                const img = p.images[0];
                return (
                  <li key={p.id} className="group flex items-center gap-3 rounded-xl bg-warm-white p-2 ring-1 ring-cream-dark">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                      {img && <Image src={img.thumbnail || img.src} alt="" fill sizes="48px" className="brighten-img object-contain p-1" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-near-black">{entry?.shortName ?? decodeEntities(p.name)}</p>
                      <p className="text-xs text-charcoal/75">{entry?.blurb}</p>
                    </div>
                    <Button size="sm" variant="dark" loading={isAdding} onClick={() => void addToCart({ id: p.id, quantity: 1, name: entry?.shortName ?? p.name, openDrawer: false })}>
                      {formatPrice(p.prices.price)} · Add
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
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
          <DeliveryPromise compact className="mb-3" />
          <dl className="flex items-baseline justify-between">
            <dt className="text-sm text-charcoal/80">Subtotal <span className="text-xs">(inc. VAT)</span></dt>
            <dd className="font-playfair text-2xl font-semibold tabular-nums text-near-black">{formatPrice(subtotalPence)}</dd>
          </dl>
          <p className="mt-1 text-xs text-charcoal/75">Royal Mail tracked delivery from {formatPrice(640)}, chosen at checkout.</p>
          <ButtonLink href="/checkout" size="lg" className={`mt-4 w-full ${pendingKeys.size > 0 || !checkout.ok ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={pendingKeys.size > 0 || !checkout.ok} onClick={closeCart}>
            Go to checkout
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </ButtonLink>
          <Link href="/basket" onClick={closeCart} className="mt-2 block w-full text-center text-sm font-medium text-charcoal/75 transition-colors duration-150 hover:text-red">
            View basket
          </Link>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-charcoal/80">
            <li className="rounded-lg bg-cream px-2 py-1.5">🔒 Secure checkout</li>
            <li className="rounded-lg bg-cream px-2 py-1.5">📦 Same-day dispatch</li>
            <li className="rounded-lg bg-cream px-2 py-1.5">🔑 3 keys included</li>
          </ul>
          <p className="mt-2 text-center text-[11px] text-charcoal/75">You’ll complete payment on wdlocks.co.uk, our secure WooCommerce checkout.</p>
        </div>
      )}
    </Modal>
  );
}
