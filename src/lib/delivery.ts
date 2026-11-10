import { DISPATCH, SHIPPING_OPTIONS } from '@/lib/constants';

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
  /** Earliest arrival using Special Delivery 24hr. */
  expressDate: Date;
  /** Arrival window for Royal Mail 1st Class Signed For. */
  standardFrom: Date;
  standardTo: Date;
}

export function estimateDelivery(now: Date = new Date()): DeliveryEstimate {
  const p = londonParts(now);
  const beforeCutoff = p.hour < DISPATCH.cutoffHour;
  const shipsToday = beforeCutoff && !isWeekend(p.weekday);
  const dispatchDate = shipsToday ? now : nextWorkingDay(now);
  const minutesToCutoff = shipsToday ? (DISPATCH.cutoffHour - p.hour) * 60 - p.minute : 0;
  const standard = SHIPPING_OPTIONS[0];
  const express = SHIPPING_OPTIONS[1];
  return {
    shipsToday,
    minutesToCutoff,
    dispatchDate,
    expressDate: addWorkingDays(dispatchDate, express.transitDays[0]),
    standardFrom: addWorkingDays(dispatchDate, standard.transitDays[0]),
    standardTo: addWorkingDays(dispatchDate, standard.transitDays[1]),
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
