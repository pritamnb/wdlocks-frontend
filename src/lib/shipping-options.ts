/**
 * Delivery options, as WooCommerce's shipping zones define them (works in server and client components).
 *
 * The rates themselves (names, prices, VAT split, rate ids) are read from the live store by
 * src/lib/shipping-rates.ts. The few things WooCommerce does not hold, the short label, the "3–5 working days" line
 * and the transit days used for the delivery-date estimate, are derived from the rate's own name, so a rate renamed,
 * repriced, added or removed in WooCommerce shows here without a code change.
 */
import type { WooShippingRate } from '@/types';

export interface ShippingOption {
  /** Store API rate id (`method:instance`), also the option's id in the basket. */
  id: string;
  rateId: string;
  methodId: string;
  instanceId: number;
  /** Rate name without its bracketed timing ("Royal Mail 1st Class Signed For"). */
  label: string;
  /** The rate's full name on the store, used as the order's shipping method title. */
  methodTitle: string;
  /** "3–5 working days", "next working day", "Saturday", or '' when the name says nothing about timing. */
  eta: string;
  /** Inc-VAT price in pence (what the shopper sees). */
  pricePence: number;
  /** WooCommerce's split: ex-VAT shipping line + shipping tax. */
  exVatPence: number;
  taxPence: number;
  /** Working days in transit after dispatch, for the delivery-date estimate; null when unknown. */
  transitDays: readonly [number, number] | null;
}

function timing(name: string): { label: string; eta: string; transitDays: readonly [number, number] | null } {
  const bracket = name.match(/\(([^)]*)\)\s*$/);
  const label = bracket ? name.slice(0, bracket.index).trim() : name.trim();
  const range = (bracket?.[1] ?? name).match(/(\d+)\s*(?:[–-]|to)\s*(\d+)\s*(?:working\s+)?days?/i);
  if (range) return { label, eta: bracket?.[1]?.trim() ?? `${range[1]}–${range[2]} working days`, transitDays: [Number(range[1]), Number(range[2])] };
  if (/saturday/i.test(name)) return { label, eta: 'Saturday', transitDays: [1, 1] };
  if (/24\s*h(ou)?r|next\s+(working\s+)?day/i.test(name)) return { label, eta: 'next working day', transitDays: [1, 1] };
  return { label, eta: bracket?.[1]?.trim() ?? '', transitDays: null };
}

/** One Store API shipping rate as a delivery option. */
export function toShippingOption(rate: WooShippingRate): ShippingOption {
  const exVatPence = Number.parseInt(rate.price, 10) || 0;
  const taxPence = Number.parseInt(rate.taxes, 10) || 0;
  const name = rate.name.replace(/&#8211;|&ndash;/g, '–').replace(/&amp;/g, '&');
  return {
    id: rate.rate_id,
    rateId: rate.rate_id,
    methodId: rate.method_id,
    instanceId: rate.instance_id,
    methodTitle: name,
    ...timing(name),
    pricePence: exVatPence + taxPence,
    exVatPence,
    taxPence,
  };
}

/** The option with this id, else the first (cheapest-listed) one, else null when the store offered none. */
export function pickShippingOption(options: readonly ShippingOption[], id: string | null | undefined): ShippingOption | null {
  return options.find((o) => o.id === id) ?? options[0] ?? null;
}
