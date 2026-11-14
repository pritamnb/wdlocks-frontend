'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { WooProduct } from '@/types';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/useCart';
import { previewFromProduct } from '@/lib/basket';
import { formatPrice, decodeEntities } from '@/lib/wdlocks-api';
import { canCheckout } from '@/lib/checkout';
import { CHECKOUT_MODE, SITE, UPSELL_PRODUCT_IDS } from '@/lib/constants';
import { catalogueEntry } from '@/lib/catalogue';

/** Ultion-style cart page: trust bar, line table, "Don't forget", totals, proceed to checkout. */
export function BasketPage({ products = [] }: { products?: WooProduct[] }) {
  const { cart, status, error, itemCount, subtotalPence, pendingKeys, updateCartItem, removeCartItem, refresh, addToCart, isAdding, shippingOptions } = useCart();
  const items = cart?.items ?? [];
  const gate = canCheckout(cart);
  const inCart = new Set(items.map((i) => i.id));
  const upsells = UPSELL_PRODUCT_IDS.map((id) => products.find((p) => p.id === id))
    .filter((p): p is WooProduct => Boolean(p) && !inCart.has(p!.id) && p!.is_in_stock)
    .slice(0, 2);
  const cheapest = shippingOptions[0] ?? null;

  return (
    <>
      <div className="container-wd py-10 sm:py-14">
        <h1 className="heading-display text-3xl sm:text-4xl">Your basket</h1>

        {status === 'loading' && !cart ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : status === 'error' && !cart ? (
          <div role="alert" className="mt-8 rounded-2xl border border-cream-dark bg-warm-white p-8 text-center">
            <p className="text-sm text-charcoal/80">{error ?? 'We couldn’t load your basket.'}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refresh()}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-cream-dark bg-warm-white p-12 text-center">
            <p className="font-playfair text-xl font-semibold text-near-black">Your basket is currently empty.</p>
            <p className="mt-2 text-sm text-charcoal/75">Every Watchdog lock ships with three keys as standard.</p>
            <ButtonLink href="/#products" size="lg" className="mt-6">Return to the shop</ButtonLink>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-cream-dark bg-warm-white">
                <div className="hidden grid-cols-[1fr_auto] items-center gap-4 border-b border-cream-dark bg-cream-mid px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/70 sm:grid">
                  <span>Product</span>
                  <span>Subtotal</span>
                </div>
                <ul className="divide-y divide-cream-dark px-5">
                  {items.map((item) => (
                    <CartLineItem
                      key={item.key}
                      item={item}
                      pending={pendingKeys.has(item.key)}
                      onQuantity={(key, qty) => void updateCartItem(key, qty)}
                      onRemove={(key) => void removeCartItem(key)}
                      onNavigate={() => undefined}
                    />
                  ))}
                </ul>
              </div>

              {upsells.length > 0 && (
                <div className="mt-6 rounded-2xl border border-cream-dark bg-cream p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/75">Don’t forget</p>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {upsells.map((p) => {
                      const entry = catalogueEntry(p);
                      const img = p.images[0];
                      return (
                        <li key={p.id} className="flex items-center gap-3 rounded-xl bg-warm-white p-3 ring-1 ring-cream-dark">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                            {img && <Image src={img.thumbnail || img.src} alt="" fill sizes="56px" className="object-contain p-1" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-near-black">{entry?.shortName ?? decodeEntities(p.name)}</p>
                            <p className="text-xs text-charcoal/75">{entry?.blurb}</p>
                          </div>
                          <Button size="sm" variant="dark" loading={isAdding} onClick={() => void addToCart({ id: p.id, quantity: 1, name: entry?.shortName ?? p.name, openDrawer: false, preview: previewFromProduct(p, 1, entry?.shortName ?? p.name) })}>
                            {formatPrice(p.prices.price)} · Add
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

            </div>

            <aside className="lg:col-span-4">
              <div className="rounded-2xl border border-cream-dark bg-warm-white p-6">
                <h2 className="font-playfair text-xl font-semibold text-near-black">Basket totals</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-charcoal/80">Subtotal <span className="text-xs">({itemCount} {itemCount === 1 ? 'item' : 'items'}, inc. VAT)</span></dt><dd className="font-semibold tabular-nums text-near-black">{formatPrice(subtotalPence)}</dd></div>
                  <div className="flex justify-between"><dt className="text-charcoal/80">Delivery</dt><dd className="text-right text-charcoal/80">{cheapest ? `from ${formatPrice(cheapest.pricePence)}` : 'priced'}<br /><span className="text-xs">chosen at checkout</span></dd></div>
                  <div className="flex justify-between border-t border-cream-dark pt-3"><dt className="font-semibold text-near-black">Total <span className="text-xs font-normal text-charcoal/70">inc. VAT, before delivery</span></dt><dd className="font-playfair text-2xl font-semibold tabular-nums text-near-black">{formatPrice(subtotalPence)}</dd></div>
                </dl>
                {!gate.ok && (
                  <div role="alert" className="mt-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-xs text-charcoal">
                    {gate.reason} <a href={SITE.phoneHref} className="font-semibold text-near-black hover:text-red">{SITE.phone}</a>
                  </div>
                )}
                <ButtonLink href="/checkout" size="lg" className={`mt-5 w-full ${!gate.ok ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={!gate.ok}>
                  Proceed to checkout
                </ButtonLink>
                <p className="mt-3 text-center text-xs text-charcoal/75">{CHECKOUT_MODE === 'handoff' ? 'Payment is taken securely on wdlocks.co.uk.' : 'Delivery is chosen and payment taken on the next page.'}</p>
              </div>
              <Link href="/#products" className="mt-4 inline-block text-sm font-medium text-charcoal/75 hover:text-red">← Continue shopping</Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
