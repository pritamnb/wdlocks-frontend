/**
 * Demo checkout (server side). With NEXT_PUBLIC_CHECKOUT_MODE=demo and no Stripe/WooCommerce keys, the on-site
 * checkout runs end to end against a pretend payment provider: no money moves and no order is written to
 * WooCommerce. The "order" lives in one httpOnly cookie so the return page can poll it like the real thing.
 * Swap the env vars for real keys and every route takes the Stripe + WooCommerce path instead.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isSecureRequest } from '@/lib/request-utils';
import { isStripeConfigured } from '@/lib/stripe-server';
import { isWcRestConfigured } from '@/lib/wc-rest';
import type { CheckoutOrderStatus, CheckoutStatusResponse } from '@/types';

export const DEMO_ORDER_COOKIE = 'wd_demo_order';
const TTL_SECONDS = 60 * 60 * 24;

export interface DemoOrder {
  id: number;
  key: string;
  number: string;
  /** Minor units (pence). */
  total: number;
  email: string;
  status: CheckoutOrderStatus;
  createdAt: number;
  /** Sandbox stage only: the real Stripe (test-mode) PaymentIntent this pretend order is paid through. */
  intentId?: string;
  /** The shopper's order notes (what becomes customer_note on a WooCommerce order). */
  customerNote?: string;
  /** What was priced: id × quantity at the Store API unit price (pence), plus the chosen delivery rate. */
  lines?: Array<{ id: number; q: number; unit: number }>;
  shipping?: { id: string; pence: number };
  /** Pence of VAT inside `total`. */
  tax?: number;
}

export function isDemoCheckout(): boolean {
  return process.env.NEXT_PUBLIC_CHECKOUT_MODE === 'demo';
}

/**
 * Stage 1 of the payments rollout ("sandbox"): Stripe TEST keys are set but no WooCommerce REST key. The shopper sees
 * the real Stripe Payment Element and pays with Stripe's test cards; the PaymentIntent is real (test mode, nothing is
 * charged) while the order stays a pretend one in the cookie, so the live shop sees nothing. Stage 2 adds the
 * WooCommerce key and every route takes the real order path.
 */
export function isStripeSandbox(): boolean {
  return isDemoCheckout() && isStripeConfigured() && !isWcRestConfigured();
}

/** Not a secret worth protecting (demo orders are make-believe) — it only keeps the cookie from being hand-edited. */
function signingKey(): string {
  return process.env.DEMO_CHECKOUT_SIGNING_KEY ?? 'wdlocks-demo-checkout';
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

export function newDemoOrder(total: number, email: string, customerNote?: string, detail?: Pick<DemoOrder, 'lines' | 'shipping' | 'tax'>): DemoOrder {
  const id = 900000 + Math.floor(Math.random() * 99999);
  return {
    id,
    key: `wc_order_demo${randomBytes(6).toString('hex')}`,
    number: String(id),
    total,
    email,
    status: 'pending',
    createdAt: Date.now(),
    ...(customerNote ? { customerNote } : {}),
    ...(detail ?? {}),
  };
}

export function readDemoOrder(req: Request): DemoOrder | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1 || part.slice(0, idx).trim() !== DEMO_ORDER_COOKIE) continue;
    const raw = decodeURIComponent(part.slice(idx + 1).trim());
    const dot = raw.lastIndexOf('.');
    if (dot === -1) return null;
    const payload = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    const expected = sign(payload);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    try {
      const order = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DemoOrder;
      if (Date.now() - order.createdAt > TTL_SECONDS * 1000) return null;
      return order;
    } catch {
      return null;
    }
  }
  return null;
}

export function writeDemoOrder(req: Request, res: NextResponse, order: DemoOrder): void {
  const payload = Buffer.from(JSON.stringify(order), 'utf8').toString('base64url');
  res.cookies.set(DEMO_ORDER_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export function toDemoStatus(order: DemoOrder): CheckoutStatusResponse {
  return {
    orderId: order.id,
    orderNumber: order.number,
    status: order.status,
    paid: order.status === 'processing' || order.status === 'completed',
    total: (order.total / 100).toFixed(2),
    currency: 'GBP',
    ...(order.email ? { email: order.email } : {}),
  };
}

/** Test numbers, mirroring Stripe's: 4242… succeeds, 4000 0000 0000 0002 is declined, 4000 0025 0000 3155 "needs 3-D Secure". */
export type DemoOutcome = 'succeeded' | 'declined' | 'requires_action';

export function demoOutcomeForCard(cardNumber: string): DemoOutcome {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits === '4000000000000002') return 'declined';
  if (digits === '4000002500003155') return 'requires_action';
  return 'succeeded';
}
