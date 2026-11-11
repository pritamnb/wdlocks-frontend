import { NextResponse } from 'next/server';
import { errorResponse, readJson } from '@/lib/cart-proxy';
import { isDemoCheckout, readDemoOrder, writeDemoOrder, toDemoStatus, type DemoOutcome } from '@/lib/demo-checkout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OUTCOMES = new Set<DemoOutcome>(['succeeded', 'declined', 'requires_action']);

/**
 * POST /api/checkout/demo   body: { orderId, orderKey, outcome: 'succeeded' | 'declined' | 'requires_action', method }
 * Pretend payment provider for NEXT_PUBLIC_CHECKOUT_MODE=demo: flips the demo order to paid/failed. Never charges
 * anything and never touches WooCommerce. 404 outside demo mode.
 */
export async function POST(req: Request) {
  if (!isDemoCheckout()) return errorResponse(404, 'not_found', 'Not found.');
  const body = await readJson(req);
  if (!body) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');
  const order = readDemoOrder(req);
  if (!order || order.id !== Number(body.orderId) || order.key !== body.orderKey) {
    return errorResponse(404, 'order_not_found', 'Order not found.');
  }
  const outcome = body.outcome as DemoOutcome;
  if (!OUTCOMES.has(outcome)) return errorResponse(400, 'invalid_request', 'Unknown outcome.');
  const method = typeof body.method === 'string' ? body.method.slice(0, 20) : 'card';

  // A little latency so the UI's processing state is visible, like a real authorisation.
  await new Promise((r) => setTimeout(r, 700));

  if (outcome === 'declined') {
    const failed = { ...order, status: 'failed' as const };
    const res = NextResponse.json({ ...toDemoStatus(failed), message: 'Your card was declined (demo).', method }, { status: 402, headers: { 'Cache-Control': 'no-store, private' } });
    writeDemoOrder(req, res, failed);
    return res;
  }
  const paid = { ...order, status: 'processing' as const };
  const res = NextResponse.json({ ...toDemoStatus(paid), method }, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
  writeDemoOrder(req, res, paid);
  return res;
}
