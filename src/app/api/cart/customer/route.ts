import {
  proxyCartRequest,
  toProxyResponse,
  upstreamDownResponse,
  errorResponse,
  readJson,
  parseAddress,
} from '@/lib/cart-proxy';
import type { CheckoutAddressInput } from '@/types';

export const dynamic = 'force-dynamic';

/** The Store API shipping address schema has no `email` property; keep it on the billing side only. */
function toShippingAddress(address: CheckoutAddressInput): Omit<CheckoutAddressInput, 'email'> {
  const { email: _email, ...rest } = address;
  void _email;
  return rest;
}

/**
 * POST /api/cart/customer   body: UpdateCustomerRequest { billing_address, shipping_address? }
 * Upstream Store API endpoint is POST /cart/update-customer. When shipping_address is omitted the
 * billing address is shipped to as well, so the cart recalculates shipping rates and VAT for it.
 * Responses: 200 cart · 400 invalid address · 502 upstream down.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');

  const billing = parseAddress(body.billing_address);
  if (!billing) return errorResponse(400, 'invalid_address', 'Check the billing address: name, address, town, postcode and country are required.');

  let shipping: CheckoutAddressInput = billing;
  if (body.shipping_address !== undefined && body.shipping_address !== null) {
    const parsed = parseAddress(body.shipping_address);
    if (!parsed) return errorResponse(400, 'invalid_address', 'Check the delivery address: name, address, town, postcode and country are required.');
    shipping = parsed;
  }

  try {
    const result = await proxyCartRequest(req, '/cart/update-customer', {
      method: 'POST',
      body: { billing_address: billing, shipping_address: toShippingAddress(shipping) },
    });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}
