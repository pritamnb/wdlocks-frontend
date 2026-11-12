# Stripe checkout — server-side notes (11 Nov 2026)

> **Superseded in part on 12 Nov 2026 (client-held basket, Pass 45 in competitor-study.md §8).** The Store API cart
> proxy (`src/lib/cart-proxy.ts`, `/api/cart/*`) is gone: the basket lives in the browser (`src/lib/basket.ts`,
> `useCart`), the intent route receives ids + quantities + the delivery option and re-prices them from the Store API
> products endpoint (`src/lib/pricing.ts`, cached 5 min) before creating the order. Validators moved to
> `src/lib/request-utils.ts`; `cartHash` now fingerprints the priced basket. Coupons were dropped. The webhook,
> status route and order reuse are unchanged. The table below describes the 11 Nov state.

Implements the server half of approach (b) in `stripe-checkout-plan.md`. No UI files were touched
(`src/components`, `src/app/checkout`, `src/hooks`, `src/app/page.tsx` are the other engineer's).

## What was built

| File | Purpose |
|---|---|
| `src/lib/cart-proxy.ts` | `CartPath` + `update-customer`, `select-shipping-rate`, `apply-coupon`, `remove-coupon`; `parseAddress`, `parseRateId`, `parseCouponCode`, `parsePackageId`; `isSecureRequest` exported |
| `src/app/api/cart/{customer,shipping,coupon}/route.ts` | Thin proxies; 400 on invalid input, cart JSON + refreshed `wd_cart_token` cookie otherwise |
| `src/lib/server-env.ts` | The only place `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `WC_CONSUMER_KEY/SECRET` are read |
| `src/lib/stripe-server.ts` | Lazy `getStripe()` singleton, `apiVersion` pinned to `2026-10-28.endive` (stripe@23.1.0 default), `isStripeConfigured()` |
| `src/lib/wc-rest.ts` | WC REST v3 Basic-auth client: `createOrder`, `getOrder`, `updateOrder`, `markOrderPaid`, `addOrderNote`, cart→order mapping |
| `src/lib/checkout-cart-hash.ts` | `cartHash(cart)` sha256 of items/coupons/selected rates/total (32 hex) |
| `src/lib/rate-limit.ts` | In-memory fixed-window limiter (10/min/IP on the intent route) |
| `src/app/api/checkout/intent/route.ts` | Order + PaymentIntent creation with reuse via the `wd_checkout_order` cookie |
| `src/app/api/checkout/status/route.ts` | Order status for the return page |
| `src/app/api/stripe/webhook/route.ts` | Signature-verified lifecycle sync Stripe → WooCommerce |
| `next.config.ts` | CSP + `Permissions-Policy` for Stripe.js, Elements, wallets |

Intent flow: validate body → `GET /cart` by Cart-Token → checks (items, selected rate when `needs_shipping`,
GBP, ≥ 30p, `expected_total === totals.total_price` else `409 total_mismatch`) → reuse the pending order in the
cookie when its cart hash and total still match (addresses are refreshed), else `POST /orders` → **the REST
order total must equal the Store API total** (else the order is cancelled with a note and we answer
`502 order_total_mismatch`) → reuse/update the order's `_stripe_intent_id` intent or create one
(`idempotencyKey wc-order-{id}-{total}`, metadata `wc_order_id`, `wc_order_key`, `cart_hash`) → store
`transaction_id` + meta → set cookie → `CreatePaymentIntentResponse`.

Webhook: `payment_intent.succeeded` → skip if paid, else `set_paid` + note (amount/currency mismatch → `on-hold` +
note instead); `payment_failed` → `failed` + note; `processing` → `on-hold` + note; `charge.refunded` → note only.
Returns 500 when WooCommerce could not be updated so Stripe retries; event-id dedupe is per warm instance only.

## Decisions worth knowing

- `shipping_lines[].total` is sent **excluding tax** (Store API `price`), not `price + taxes`: WooCommerce
  recalculates shipping tax from that field on save, so including tax would double it. The REST-vs-Store total
  check guards both ways; if it ever trips, inspect the order note and the client's shipping tax settings.
- WooCommerce forces `created_via = rest-api` on REST-created orders; headless orders carry
  meta `_headless_site = wdlocks-frontend` and `_headless_cart_hash` instead.
- WC REST schema types `shipping_lines[].instance_id` and `total` as strings; we send strings.
- Variation cart items: `item.id` is the variation id; parent comes from `VARIATIONS_BY_PRODUCT`. Unknown
  variation → sent as `product_id` with no `variation_id` (WooCommerce resolves the parent itself).
- Old pending orders are not auto-cancelled when the basket changes; rely on WooCommerce's "hold stock" timeout.
- Error codes beyond the contract (all `WooStoreError` shaped): `rate_limited` 429, `empty_cart`,
  `shipping_required`, `unsupported_currency`, `amount_too_small` 400, `already_paid`, `payment_processing` 409,
  `order_create_failed`, `order_total_mismatch`, `payment_init_failed`, `upstream_unavailable` 502.

## Untested (no keys exist yet)

Nothing has run against Stripe or the WC REST API: `npx tsc --noEmit` and ESLint are the only verification.
Open until the client supplies test keys: REST order total parity with the Store API (VAT on shipping, coupons),
`instance_id` typing, the `set_paid` + `status` PUT combination, webhook signature round-trip
(`stripe listen`), PaymentIntent reuse/update paths, behaviour of the shared host with `Authorization` headers
(plan §3d mentions some strip it — then add query-string auth to `wc-rest.ts`).

## What the client must provide

Own-account Stripe test + live keys (`pk_`, `sk_`), a webhook endpoint for the four events (or permission to
create one) and its `whsec_`; a Read/Write WooCommerce REST key for a dedicated "Headless checkout" user; confirm
permalinks are not Plain; enable Cards, Apple Pay, Google Pay, Link, Klarna, Clearpay, PayPal in the Dashboard
and register the production + preview domains under Payment method domains; confirm the flat-rate ids and
whether non-GB addresses are refused.
