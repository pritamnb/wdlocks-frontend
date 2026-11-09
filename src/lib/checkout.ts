import { CHECKOUT_URL, HANDOFF_PLUGIN_INSTALLED } from '@/lib/constants';
import type { WooCart } from '@/types';

/**
 * Hands the basket over to the WooCommerce checkout on wdlocks.co.uk.
 *
 * The basket lives in a Store API session held by our proxy (Cart-Token). The shopper's browser
 * has NO WooCommerce session cookie for wdlocks.co.uk, so linking to /checkout/ alone shows an
 * empty basket. Two handoff modes:
 *
 *  1. PLUGIN mode (NEXT_PUBLIC_CART_HANDOFF_PLUGIN=true — requires backend/wd-cart-handoff.php on
 *     WordPress):  /checkout/?wd_items=<id>:<qty>,<id>:<qty>
 *     The plugin EMPTIES the WooCommerce basket, adds every line, then redirects to a clean
 *     /checkout/ URL, so refresh / back / a second visit can never double-add. Any number of lines.
 *
 *  2. NATIVE mode (default, no backend change): /checkout/?add-to-cart=<id>&quantity=<n>
 *     WooCommerce core handles exactly ONE line per request and does not clean the URL, so a
 *     refresh re-adds it. Therefore native mode only permits single-line baskets (see canCheckout)
 *     and we clear the headless basket on handoff so returning shoppers can't re-send it.
 */
export function canCheckout(cart: WooCart | null): { ok: boolean; reason?: string } {
  if (!cart || cart.items.length === 0) return { ok: false, reason: 'Your basket is empty.' };
  if (!HANDOFF_PLUGIN_INSTALLED && cart.items.length > 1) {
    return {
      ok: false,
      reason:
        'Our checkout currently accepts one product line at a time. Please remove the extra lines and order them separately, or call us to place a combined order.',
    };
  }
  return { ok: true };
}

export function buildCheckoutUrl(cart: WooCart): string {
  const url = new URL(CHECKOUT_URL);
  if (cart.items.length === 0) return url.toString();

  if (HANDOFF_PLUGIN_INSTALLED) {
    url.searchParams.set('wd_items', cart.items.map((i) => `${i.id}:${i.quantity}`).join(','));
  } else {
    const [first] = cart.items;
    url.searchParams.set('add-to-cart', String(first.id));
    url.searchParams.set('quantity', String(first.quantity));
  }
  url.searchParams.set('utm_source', 'headless');
  return url.toString();
}
