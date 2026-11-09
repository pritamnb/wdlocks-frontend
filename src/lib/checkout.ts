import { CHECKOUT_URL } from '@/lib/constants';
import type { WooCart } from '@/types';

/**
 * Builds the URL that hands the basket over to the WooCommerce checkout on wdlocks.co.uk.
 *
 * The basket lives in a Store API session held by our proxy (Cart-Token). The browser has NO
 * WooCommerce session cookie for wdlocks.co.uk, so simply linking to /checkout/ would show an
 * empty basket. Instead we re-add the lines via WooCommerce's native add-to-cart URL handler:
 *
 *   /checkout/?add-to-cart=<id>&quantity=<n>          — native, handles ONE line (variation IDs OK)
 *   &wd_items=<id>:<qty>,<id>:<qty>                    — remaining lines, processed by the tiny
 *                                                        mu-plugin in /backend/wd-cart-handoff.php
 *
 * Without the mu-plugin installed only the first line is carried over — see README "Checkout handoff".
 */
export function buildCheckoutUrl(cart: WooCart): string {
  const url = new URL(CHECKOUT_URL);
  const [first, ...rest] = cart.items;
  if (!first) return url.toString();

  url.searchParams.set('add-to-cart', String(first.id));
  url.searchParams.set('quantity', String(first.quantity));
  if (rest.length) {
    url.searchParams.set('wd_items', rest.map((i) => `${i.id}:${i.quantity}`).join(','));
  }
  url.searchParams.set('utm_source', 'headless');
  return url.toString();
}
