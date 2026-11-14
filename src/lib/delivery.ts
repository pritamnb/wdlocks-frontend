import { DISPATCH } from '@/lib/constants';
import type { ShippingOption } from '@/lib/shipping-options';

/** Local date parts in Europe/London for a given instant. */
function londonParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPATCH.timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    weekday: parts.weekday as string, // Mon..Sun
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
  };
}

const isWeekend = (weekday: string) => weekday === 'Sat' || weekday === 'Sun';

function addDays(date: Date, days: number) {
  const n = new Date(date);
  n.setUTCDate(n.getUTCDate() + days);
  return n;
}

/** Next working day (Mon–Fri) strictly after `from`, in London time. Bank holidays are not modelled. */
function nextWorkingDay(from: Date): Date {
  let d = addDays(from, 1);
  while (isWeekend(londonParts(d).weekday)) d = addDays(d, 1);
  return d;
}

function addWorkingDays(from: Date, days: number): Date {
  let d = from;
  for (let i = 0; i < days; i++) d = nextWorkingDay(d);
  return d;
}

export interface DeliveryEstimate {
  /** True when an order placed now ships today. */
  shipsToday: boolean;
  /** Minutes left until the cut-off (0 if passed or weekend). */
  minutesToCutoff: number;
  /** The dispatch date. */
  dispatchDate: Date;
  /** Earliest arrival with the store's fastest rate (Special Delivery 24hr today). */
  expressDate: Date;
  /** Arrival window with the store's cheapest rate (Royal Mail 1st Class Signed For today). */
  standardFrom: Date;
  standardTo: Date;
  /** The rates the two estimates use (null when the store offered no rates). */
  express: ShippingOption | null;
  standard: ShippingOption | null;
}

/** Transit used when the store's rate names say nothing about timing (Royal Mail's own published windows). */
const FALLBACK_TRANSIT = { express: [1, 1] as const, standard: [3, 5] as const };

/** Arrival window for one delivery option, counted in working days from the dispatch date. */
export function arrivalWindow(est: Pick<DeliveryEstimate, 'dispatchDate'>, option: ShippingOption): { from: Date; to: Date } | null {
  if (!option.transitDays) return null;
  return { from: addWorkingDays(est.dispatchDate, option.transitDays[0]), to: addWorkingDays(est.dispatchDate, option.transitDays[1]) };
}

/**
 * Dispatch and arrival estimate for an order placed `now`, from the 2 pm London cut-off and the store's delivery
 * options (`options`, cheapest first, as the layout reads them from WooCommerce).
 */
export function estimateDelivery(now: Date = new Date(), options: readonly ShippingOption[] = []): DeliveryEstimate {
  const p = londonParts(now);
  const beforeCutoff = p.hour < DISPATCH.cutoffHour;
  const shipsToday = beforeCutoff && !isWeekend(p.weekday);
  const dispatchDate = shipsToday ? now : nextWorkingDay(now);
  const minutesToCutoff = shipsToday ? (DISPATCH.cutoffHour - p.hour) * 60 - p.minute : 0;
  const timed = options.filter((o) => o.transitDays);
  const standard = timed[0] ?? options[0] ?? null;
  const express = [...timed].sort((a, b) => a.transitDays![0] - b.transitDays![0] || a.pricePence - b.pricePence)[0] ?? null;
  const expressDays = express?.transitDays ?? FALLBACK_TRANSIT.express;
  const standardDays = standard?.transitDays ?? FALLBACK_TRANSIT.standard;
  return {
    shipsToday,
    minutesToCutoff,
    dispatchDate,
    expressDate: addWorkingDays(dispatchDate, expressDays[0]),
    standardFrom: addWorkingDays(dispatchDate, standardDays[0]),
    standardTo: addWorkingDays(dispatchDate, standardDays[1]),
    express,
    standard,
  };
}

export function formatDeliveryDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: DISPATCH.timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
