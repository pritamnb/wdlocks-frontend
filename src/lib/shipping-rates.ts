/**
 * Live delivery rates from WooCommerce (server only).
 *
 * Shipping rates are only exposed through a cart, so the same throwaway Store API cart the promo-code check uses
 * (src/lib/coupon.ts) is opened: GET /cart hands out a Cart-Token, one in-stock simple product is added and a UK
 * address set, and WooCommerce answers with every rate its shipping zones offer (names, ex-VAT price, tax, rate ids).
 * It is what the old site's own basket does for every visitor; nothing on wdlocks.co.uk is configured or changed,
 * and the throwaway cart expires like any abandoned basket.
 *
 * Rates change rarely, so they are kept for an hour per server instance, with the last good answer served while the
 * store is unreachable. Before any answer has come back the list is empty and the basket says delivery is worked out
 * at checkout.
 */
import { STORE_API } from '@/lib/constants';
import { getProductsSSR } from '@/lib/api';
import { toShippingOption, type ShippingOption } from '@/lib/shipping-options';
import type { WooShippingPackage } from '@/types';

const TTL_MS = 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;
const TIMEOUT_MS = 12_000;
/** Any mainland UK address: the store has one UK zone. Only country and postcode decide the rate. */
const PROBE_ADDRESS = { first_name: 'Rate', last_name: 'Check', address_1: '1 Parliament Square', city: 'London', postcode: 'SW1A 1AA', country: 'GB' };

let cached: { options: ShippingOption[]; expiresAt: number } | null = null;
let inFlight: Promise<ShippingOption[]> | null = null;

async function storeFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${STORE_API}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'User-Agent': 'wdlocks-frontend/1.0 (+delivery-rates)', ...(init.headers ?? {}) },
      // No `cache` option on purpose: these cart calls are never served from Next's data cache (each opens a new
      // cart), and an explicit 'no-store' would turn every page that shows delivery prices into a per-request render
      // instead of the 60-second ISR pages. The hour-long memo below is the cache.
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRates(): Promise<ShippingOption[]> {
  const products = await getProductsSSR();
  const probe = products.find((p) => p.type === 'simple' && p.is_in_stock && p.is_purchasable && p.add_to_cart?.minimum !== 0)
    ?? products.find((p) => p.type === 'simple' && p.is_in_stock);
  if (!probe) throw new Error('no in-stock simple product to price delivery with');

  const open = await storeFetch('/cart', { method: 'GET' });
  const token = open.headers.get('cart-token');
  if (!open.ok || !token) throw new Error(`GET /cart → ${open.status}`);

  const res = await storeFetch('/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cart-Token': token },
    body: JSON.stringify({
      requests: [
        { path: '/wc/store/v1/cart/add-item', method: 'POST', body: { id: probe.id, quantity: 1 } },
        { path: '/wc/store/v1/cart/update-customer', method: 'POST', body: { shipping_address: PROBE_ADDRESS, billing_address: { ...PROBE_ADDRESS, email: '' } } },
      ],
    }),
  });
  const json = (await res.json().catch(() => null)) as { responses?: Array<{ status: number; body: { shipping_rates?: WooShippingPackage[] } }> } | null;
  const last = json?.responses?.[1];
  if (!last || last.status >= 300) throw new Error(`batch → ${res.status}/${last?.status ?? 'no response'}`);
  const options = (last.body.shipping_rates ?? []).flatMap((pkg) => pkg.shipping_rates).map(toShippingOption);
  if (options.length === 0) throw new Error('store returned no shipping rates');
  // Cheapest first: the default option, and the "from £x" figure.
  return options.sort((a, b) => a.pricePence - b.pricePence);
}

/** The store's delivery options, cheapest first. Never throws; [] only before the first successful answer. */
export async function getShippingOptionsSSR(): Promise<ShippingOption[]> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.options;
  inFlight ??= fetchRates()
    .then((options) => {
      cached = { options, expiresAt: Date.now() + TTL_MS };
      return options;
    })
    .catch((err) => {
      console.error('[shipping] could not read delivery rates from the store', err instanceof Error ? err.message : err);
      // Keep serving the last good rates; try again in a minute.
      if (cached) cached = { options: cached.options, expiresAt: Date.now() + RETRY_AFTER_FAILURE_MS };
      return cached?.options ?? [];
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
