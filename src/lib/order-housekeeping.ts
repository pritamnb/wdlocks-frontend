/**
 * What the live checkout does to WooCommerce orders besides creating and paying them (server only).
 *
 * 1. Abandoned checkouts. Every "Place order" creates a pending WooCommerce order before the shopper pays. WooCommerce
 *    cancels unpaid orders after "Hold stock (minutes)" only for orders made by its own checkout (`created_via` =
 *    checkout); REST orders like ours would stay "Pending payment" forever. The sweep cancels OUR pending orders
 *    (`_headless_site` meta, never anyone else's) once they are older than ABANDONED_ORDER_MINUTES (default 120).
 *    Pending orders hold no stock (stock drops when the order is paid), and a payment that arrives later still
 *    reopens the order: the webhook marks it paid whatever its status. It runs at most every 15 minutes, after a
 *    checkout request has been answered (Next's after()), so it needs no cron job on the server.
 *
 * 2. Refunds made in the Stripe Dashboard. The webhook books the refunded amount on the WooCommerce order (no money
 *    moves; `api_refund: false`), so the order shows "Refunded" and the shop's reports stay right. Idempotent: it
 *    records only the difference between what Stripe has refunded and what the order already shows.
 */
import { after } from 'next/server';
import { HEADLESS_SITE_META, addOrderNote, getOrder, listPendingOrdersBetween, orderMeta, updateOrder, type WooRestOrder } from '@/lib/wc-rest';

export const DEFAULT_ABANDONED_MINUTES = 120;
const MIN_MINUTES = 30;
const MAX_MINUTES = 7 * 24 * 60;
const SWEEP_EVERY_MS = 15 * 60_000;
/** Only orders that became abandoned in the last week are looked at; the sweep runs every 15 minutes anyway. */
const LOOKBACK_MS = 7 * 24 * 60 * 60_000;
const HEADLESS_SITE = 'wdlocks-frontend';

/** ABANDONED_ORDER_MINUTES: "off" / "0" disables the sweep; otherwise 30 minutes to 7 days; anything else → default. */
export function abandonedAfterMinutes(raw: string | undefined = process.env.ABANDONED_ORDER_MINUTES): number | null {
  const v = raw?.trim().toLowerCase();
  if (!v) return DEFAULT_ABANDONED_MINUTES;
  if (v === 'off' || v === '0' || v === 'false') return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return DEFAULT_ABANDONED_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
}

/** WooCommerce's date_created_gmt has no zone suffix; it is UTC. */
function createdAtMs(order: WooRestOrder): number {
  const raw = order.date_created_gmt;
  if (!raw) return Number.NaN;
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`);
}

/** The orders the sweep may cancel: ours, still pending, never paid, created before the cutoff. */
export function selectAbandoned(orders: readonly WooRestOrder[], cutoffMs: number): WooRestOrder[] {
  return orders.filter((o) => {
    if (o.status !== 'pending' || o.date_paid) return false;
    if (orderMeta(o, HEADLESS_SITE_META) !== HEADLESS_SITE) return false;
    const created = createdAtMs(o);
    return Number.isFinite(created) && created < cutoffMs;
  });
}

/** One sweep: cancels abandoned headless orders (up to 100 per run, from the last week) and leaves a note on each. */
export async function sweepAbandonedOrders(now = Date.now()): Promise<{ cancelled: number[]; minutes: number | null }> {
  const minutes = abandonedAfterMinutes();
  if (minutes === null) return { cancelled: [], minutes };
  const cutoff = now - minutes * 60_000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 19);
  const candidates = await listPendingOrdersBetween(iso(cutoff - LOOKBACK_MS), iso(cutoff));
  const cancelled: number[] = [];
  for (const listed of selectAbandoned(candidates, cutoff)) {
    // The list can be a few seconds old: read the order again so one paid in the meantime is never cancelled. (If a
    // payment still lands after this, the webhook marks the cancelled order paid; nothing is lost.)
    const order = await getOrder(listed.id);
    if (selectAbandoned([order], cutoff).length === 0) continue;
    await updateOrder(order.id, { status: 'cancelled' });
    await addOrderNote(
      order.id,
      `Cancelled by the headless checkout: no payment within ${minutes} minutes of "Place order" (the shopper left before paying). No money was taken. If Stripe reports a payment for it later, the order is marked paid again automatically.`,
    );
    cancelled.push(order.id);
  }
  return { cancelled, minutes };
}

let lastSweepAt = 0;
let sweeping = false;

/** Starts a sweep in the background when the last one was more than 15 minutes ago. Never throws, never waits. */
export function maybeSweepAbandonedOrders(now = Date.now()): void {
  if (sweeping || now - lastSweepAt < SWEEP_EVERY_MS) return;
  lastSweepAt = now;
  sweeping = true;
  const run = () => sweepAbandonedOrders(now)
    .then(({ cancelled, minutes }) => {
      if (cancelled.length) console.info('[orders] cancelled abandoned headless orders', { count: cancelled.length, ids: cancelled, minutes });
    })
    .catch((err) => console.error('[orders] abandoned-order sweep failed', err instanceof Error ? err.message : 'unknown error'))
    .finally(() => {
      sweeping = false;
    });
  // after() keeps a serverless function alive until the sweep ends (Vercel) and runs it once the response is sent on a
  // plain Node server. Outside a request (scripts, tests) it throws, so run it directly there.
  try {
    after(run);
  } catch {
    void run();
  }
}

/* ---------------------------------------------------------------------------
 * Refunds
 * ------------------------------------------------------------------------- */

/** "-12.50" / "12.50" → 1250 */
function majorToPence(major: string | number): number {
  const n = Math.abs(Number(major));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Pence still to book on the WooCommerce order so it matches Stripe: Stripe's cumulative refunded amount minus the
 * refunds the order already carries, never more than what is left of the order total, never negative.
 */
export function refundToRecordPence(stripeRefundedPence: number, order: Pick<WooRestOrder, 'total' | 'refunds'>): number {
  const already = (order.refunds ?? []).reduce((n, r) => n + majorToPence(r.total), 0);
  const left = majorToPence(order.total) - already;
  return Math.max(0, Math.min(stripeRefundedPence - already, left));
}

/** MIRROR_STRIPE_REFUNDS=off keeps the old behaviour (a note only). */
export function mirrorRefundsEnabled(raw: string | undefined = process.env.MIRROR_STRIPE_REFUNDS): boolean {
  const v = raw?.trim().toLowerCase();
  return !(v === 'off' || v === '0' || v === 'false');
}
