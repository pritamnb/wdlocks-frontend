import {
  proxyCartRequest,
  toProxyResponse,
  upstreamDownResponse,
  errorResponse,
  readJson,
  parseRateId,
  parsePackageId,
} from '@/lib/cart-proxy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/shipping   body: SelectShippingRateRequest { package_id: number, rate_id: string }
 * Upstream Store API endpoint is POST /cart/select-shipping-rate. Responses: 200 cart · 400 invalid · 502.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return errorResponse(400, 'invalid_request', 'Request body must be a JSON object.');

  const packageId = parsePackageId(body.package_id ?? 0);
  if (packageId === null) return errorResponse(400, 'invalid_request', 'Invalid shipping package.');

  const rateId = parseRateId(body.rate_id);
  if (!rateId) return errorResponse(400, 'invalid_request', 'Invalid shipping rate.');

  try {
    const result = await proxyCartRequest(req, '/cart/select-shipping-rate', {
      method: 'POST',
      body: { package_id: packageId, rate_id: rateId },
    });
    return toProxyResponse(req, result);
  } catch (err) {
    return upstreamDownResponse(err);
  }
}
