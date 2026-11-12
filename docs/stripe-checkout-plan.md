# Stripe checkout on our domain — scan of the live checkout and build plan

Scanned 11 Nov 2026 with an anonymous Playwright session (one Bruno Teddy signal blocker, id 5565, £19.99; no address other than postcode UB6 8RF / Greenford; nothing submitted). Screenshots and raw JSON captures are in
`/private/tmp/claude-501/-Users-pritam--claude-spares-spare-Z1Xpbz/30ed1f34-b404-4477-93b7-533c3f941c7c/scratchpad/checkout-scan/`
(`checkout-desktop-1440.png`, `checkout-desktop-1440-initial.png`, `checkout-mobile-390.png`, `checkout-payment-section.png`, `checkout-desktop-initial.json`, `store-cart-with-basket.json`, `store-checkout-get.json`, `products.json`).

## 1. What the live checkout at wdlocks.co.uk/checkout/ actually is

**Headline correction:** the live site does **not** run the `woocommerce-gateway-stripe` plugin. Card payments are taken by **WooCommerce PayPal Payments 4.2.0** (`woocommerce-paypal-payments`, "Debit & Credit Cards" = PayPal Advanced Card Processing). **WooPayments 11.2.1** (`woocommerce-payments`, Stripe-backed, Automattic's Connect platform) is installed and loads `js.stripe.com/v3` on the page, but it is not an offered gateway: `wcpayConfig.paymentMethodsConfig` is `[]` and `woocommerce_payments` is absent from the Store API cart's `payment_methods`. So "Stripe already configured" is only true in the sense that a WooPayments account exists (`acct_1QhWzi…`); there is no evidence of a standalone client-owned Stripe account. This must be confirmed with the client before any Stripe build (section 5).

| Item | Finding |
|---|---|
| Template | **Classic shortcode checkout** (`form.checkout.woocommerce-checkout`, Astra theme, WooCommerce 11.2.2). Not the Blocks checkout. |
| Above the form | "“Bruno Teddy …” has been added to your basket" notice with VIEW BASKET; "Returning customer? Click here to login" (username/password/remember-me, collapsed); "Have a coupon? Click here to enter your code" (collapsed `coupon_code` + Apply coupon). |
| Billing details (order) | first name*, last name*, company (optional), country/region* (default United Kingdom), street address*, flat/suite (optional), town/city*, county (optional), postcode*, phone*, email address*. No separate "contact" step; email is the last billing field. |
| Shipping | checkbox "Deliver to a different address?" revealing the same fields (shipping_first_name … shipping_phone, no email). Hidden by default. |
| Additional information | textarea `order_comments` "Order notes (optional)", placeholder "Notes about your order, e.g. special notes for delivery." |
| Your order (right column) | Product × qty, Subtotal £19.99, "Shipment" radio list, Total £26.39 "(includes £4.40 Tax)". Prices are VAT-inclusive; shipping also carries 20% VAT. |
| Shipping methods (GB, UB6 8RF) | `flat_rate:1` Royal Mail 1st Class Signed For (3–5 working days) **£6.40** (Store API: 533 + 107 tax); `flat_rate:2` Royal Mail Special Delivery 24hr **£10.00** (833 + 167); `flat_rate:3` Saturday Delivery **£28.80** (2400 + 480). Rates were already shown with an empty address (store default GB) and did not change with the postcode. One package, `package_id` 0. |
| Payment options (radios `payment_method`) | `ppcp-gateway` **PayPal** ("Pay via PayPal."; selected by default; PayPal Pay Later banner "Pay in 30 days … £15 cashback"); `ppcp-credit-card-gateway` **Debit & Credit Cards** (hosted card number / expiry / CVV fields, PayPal card-fields SDK); `ppcp-googlepay` **Google Pay** (PayPal's Google Pay via `pay.google.com` payframe); `ppcp-trustly` **Trustly** (open banking). No Apple Pay, Klarna, Clearpay, bank transfer or cash on delivery. No express buttons above the form; when PayPal is selected the gold "Pay with PayPal" + "Pay Later" smart buttons replace Place order. |
| Gateway plugins (script URLs) | `woocommerce-paypal-payments/assets/ppcp-sdk-v6-js-boot.js`, `…/ppcp-wc-gateway-js-fraudnet.js`, `www.paypal.com/web-sdk/v6/core` + `paypal-payments`, `card-fields`, `googlepay-payments`, `paypal-messages`, `venmo-payments`; `woocommerce-payments/dist/checkout.js` + `frontend-tracks.js`; `js.stripe.com/v3/` (loaded by WooPayments only). No `woocommerce-gateway-stripe` scripts. |
| Terms | privacy sentence "Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy." then required checkbox **"I have read and agree to the website terms and conditions *"** (the terms page is embedded inline in the DOM). Button: **Place order**. |
| Trust badges | only a `secure.png` image near payment. The side-cart drawer (plugin `side-cart-woocommerce`) shows "Secure Checkout / Fast Shipping / Easy Returns" and a red "Next Day Delivery: cut-off 3pm" banner. |
| Stripe publishable key | present, from WooPayments: `pk_live_…txNs` (`wcpayConfig.publishableKey`, `accountId acct_1QhWzi…`, `testMode: ""`). It is a WooPayments platform key, usable only with `stripeAccount` through WooPayments' own server endpoints, **not** reusable by our server. |
| Other plugins seen | cookiefirst, woo-blocker-lite (fake-order blocker), facebook-for-woocommerce, google-listings-and-ads, yith ajax filter, side-cart-woocommerce, woo-product-variation-swatches, woo-custom-product-addons. |
| `/cart/` | **returns HTTP 404** ("Page Not Found") — the cart page has been removed in favour of the side-cart drawer; "VIEW BASKET" links there. |

Basket cleanup: because `/cart/` is a 404 there is no cart-page remove link. The item was removed with the side cart's own session via Store API `POST /wp-json/wc/store/v1/cart/remove-item` (nonce from the page), verified `items_count: 0`. Two earlier scan sessions were closed before their cookies were reused; those anonymous Store API sessions (one £19.99 item, no personal data) cannot be reached by anyone and expire with WooCommerce's session lifetime (48 h).

Mobile (390): single column, same order; the sticky side-cart bubble overlaps the address fields; PayPal buttons sit under the terms checkbox.

## 2. Store API checkout endpoint on wdlocks.co.uk — exists

- `OPTIONS /wp-json/wc/store/v1/checkout` → full schema: methods `GET, POST, PUT, PATCH`; POST args `billing_address`, `shipping_address`, `payment_method`, `payment_data[] {key, value}`, `customer_note`, `customer_password`, `expected_total` (string, minor units; 409 `woocommerce_rest_checkout_total_mismatch` if the server total differs).
- `GET /checkout` without a token → `401 woocommerce_rest_missing_nonce`; the response still carries `Cart-Token`, `Nonce`, `Allow: GET, POST, PUT, PATCH`, `Access-Control-Allow-Headers: … Cart-Token, Nonce`, `Access-Control-Expose-Headers: … Cart-Token`, `Access-Control-Allow-Credentials: true`. With a `Cart-Token` no nonce is needed (official docs: "When using a Cart-Token a Nonce Token is not required … the same method will allow you to checkout using a Cart-Token on the /checkout route").
- `GET /cart` (with basket): `needs_payment: true`, `needs_shipping: true`, `payment_requirements: ["products"]`, `payment_methods: ["ppcp-gateway","ppcp-credit-card-gateway","ppcp-googlepay","ppcp-trustly"]`, `has_calculated_shipping: true`, `shipping_rates[0].shipping_rates[]` with `rate_id`, `name`, `price`, `taxes`, `selected`, `method_id`; `extensions.wcpay.express_checkout_methods: ["payment_request"]`.
- `GET /wp-json/wc/v3/orders` → `401 woocommerce_rest_cannot_view` (REST API reachable; needs consumer key/secret).
- Our repo already talks to this API server-side with a Cart-Token stored in the httpOnly `wd_cart_token` cookie (`src/lib/cart-proxy.ts`, `/api/cart/*`), so the checkout endpoint is reachable through the same proxy.

## 3. Approaches

### (a) WooCommerce Store API checkout with the WooCommerce Stripe gateway (`woocommerce-gateway-stripe`, must be installed first)

Flow (all through our `/api/cart` proxy, `Cart-Token` header, no nonce):
1. `POST /cart/update-customer` `{billing_address, shipping_address}` → cart with recalculated `shipping_rates` and totals. `POST /cart/select-shipping-rate` `{package_id: 0, rate_id: "flat_rate:2"}`. Coupons: `POST /cart/apply-coupon {code}` / `remove-coupon`.
2. Client: `loadStripe(pk)`; `stripe.elements({mode:'payment', amount: cart.totals.total_price, currency:'gbp', paymentMethodCreation:'manual'})`; Payment Element; on submit `elements.submit()` then `stripe.createPaymentMethod({elements, params:{billing_details}})` → `pm_…`. This mirrors the plugin's Blocks client (`client/blocks/upe/upe-deferred-intent-creation/payment-processor.js`).
3. `POST /checkout` body: `billing_address`, `shipping_address` (all 11/10 fields, strings, `country: "GB"`), `customer_note`, `expected_total`, `payment_method: "stripe"` (or `stripe_klarna`, `stripe_afterpay_clearpay`, `stripe_paypal` for the UPE sub-gateways; the plugin strips the `stripe_` prefix to choose the Stripe type), `payment_data`:
   `[{key:"payment_method", value:"stripe"}, {key:"wc-stripe-payment-method", value:"pm_…"}, {key:"wc_payment_intent_id", value:""}, {key:"save_payment_method", value:"no"}, {key:"billing_email", …}, {key:"billing_first_name", …}, …billing_last_name, billing_address_1, billing_address_2, billing_city, billing_state, billing_postcode, billing_country]`.
   Older `stripe_source`/`wc-stripe-is-deferred-intent` keys are legacy; the current gateway reads `$_POST['wc-stripe-payment-method']` (`prepare_payment_information_from_request`), `$_POST['payment_method']` (`get_selected_payment_method_type_from_request`), `wc-stripe-confirmation-token` (alternative to a pm id), `wc_payment_intent_id`, `wc-stripe-new-payment-method`. WooCommerce core's `Legacy::process_legacy_payment` replaces `$_POST` with `payment_data`, calls the gateway's `process_payment()`, copies the result into `payment_result`: `payment_status` (success|failure|pending|error, else failure), `payment_details` = every extra key the gateway returned, `redirect_url` = `redirect`. A gateway failure with a message → HTTP 400 `woocommerce_rest_payment_error`.
4. The gateway creates and confirms the PaymentIntent server-side (deferred intent). If the intent is `succeeded`, `payment_status: "success"` and `redirect_url` is the order-received page. If it `requires_action` (3DS) the response has `payment_status: "success"`, `payment_details.redirect` = `…#wc-stripe-confirm-pi:{order_id}:{client_secret}:{nonce}` (`si` for setup intents), plus `payment_method` and `stripe_confirm_return_url`, and `payment_details.verification_endpoint` (`wc-ajax=wc_stripe_verify_intent&order=…&nonce=…&redirect_to=…`). Client: parse with `/#wc-stripe-confirm-(pi|si):(.+):(.+):(.+)$/`, `stripe.confirmPayment({clientSecret, redirect:'if_required', confirmParams:{return_url}})`, then navigate the browser to `verification_endpoint` (top-level GET; it verifies the intent in WP and redirects to `redirect_to`) — or rely on the plugin's Stripe webhook which also marks the order paid. `GET /checkout` returns the draft order (`order_id`, `status: checkout-draft`, `order_key`, empty `payment_result`).
5. Publishable key: the plugin exposes it as `key` in `wc_stripe_upe_params` / Blocks `stripe_data` (`getBlocksConfiguration().key`, plus `accountId`, `locale`, `paymentMethodsConfig`), i.e. only inside WP page HTML. For our build take it as an env var from the client (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) and keep it identical to the plugin's.

Pros: WooCommerce stays the system of record (stock reservation, coupons, VAT, order emails, refunds from the Woo order screen, Stripe metadata written by the plugin); no webhook or secret key on Vercel; totals are never computed by us (`expected_total` guards the rest). Cons: client must install and connect the free Stripe plugin (and switch card processing from PayPal to Stripe); the 3DS fragment/verification contract is plugin-internal and can change; Apple Pay/Google Pay need the plugin's express checkout domain file and our domain registered; PayPal via the existing `ppcp-gateway` is not usable this way (its `createOrder`/`approve_order` wc-ajax calls need the WP page session and nonces; Blocks sends `payment_data: paypal_order_id, funding_source`).

### (b) Stripe directly from Next.js, order created through the WC REST API

Flow:
1. Quote with the Store API cart as today (items, VAT, shipping rates, coupon) — it is the only place Woo's pricing rules live.
2. Client renders **Express Checkout Element** (Apple Pay, Google Pay, Link, PayPal, Klarna buttons; needs the domain registered at Stripe → Payment method domains, sandbox and live, with the Apple file served at `/.well-known/apple-developer-merchantid-domain-association`) and the **Payment Element** (cards, Klarna, Clearpay, PayPal, Revolut Pay as enabled in the Dashboard), both on `elements({mode:'payment', amount, currency:'gbp'})`; ECE `shippingaddresschange`/`shippingratechange` events resolve shipping rates from the Store API and `elements.update({amount})`.
3. On submit: `elements.submit()` → `POST /api/checkout/intent` (server): re-fetch the cart by Cart-Token, compute `amount = totals.total_price`, create the WooCommerce order first (`POST /wp-json/wc/v3/orders`, Basic auth ck/cs over HTTPS: `status: "pending"`, `payment_method: "stripe"`, `payment_method_title: "Card (Stripe)"`, `set_paid: false`, `billing`, `shipping`, `line_items[{product_id, variation_id, quantity}]`, `shipping_lines[{method_id:"flat_rate", instance_id, method_title, total}]`, `coupon_lines[{code}]`, `customer_note`, `created_via: "headless"`, `meta_data`) and verify the REST order `total` equals the Store API total before charging; then `stripe.paymentIntents.create({amount, currency:'gbp', automatic_payment_methods:{enabled:true}, metadata:{wc_order_id, wc_order_key, cart_hash}, description:'WD Locks order #…', receipt_email}, {idempotencyKey: `wc-order-${id}-${cart_hash}`})`, store `transaction_id`/`_stripe_intent_id` on the order (`PUT /orders/{id}`), return `client_secret`.
4. Client `stripe.confirmPayment({elements, clientSecret, confirmParams:{return_url: https://<site>/checkout/return?order=…&key=…}, redirect:'if_required'})`; redirect-based methods (Klarna, Clearpay, PayPal) come back to `return_url` with `payment_intent` + `payment_intent_client_secret`; the return page polls our `/api/checkout/status`.
5. Webhook `POST /api/stripe/webhook` (App Router route, `export const runtime='nodejs'`, read `await req.text()` for the raw body, `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)`, 5-minute tolerance): on `payment_intent.succeeded` → `PUT /wp-json/wc/v3/orders/{metadata.wc_order_id}` `{set_paid: true, transaction_id: pi_…, status: "processing"}` (set_paid "will set the status to processing and reduce stock items"); `payment_intent.payment_failed` → add order note / `status: failed`; `charge.refunded` → create a Woo refund; `payment_intent.processing` (Bacs) → `on-hold`. Return 2xx fast, dedupe on `event.id` (Stripe retries for up to 3 days, order of events is not guaranteed), and make the Woo update idempotent (skip if already paid). Vercel region is `lhr1`; the function must not be behind the CSP or any auth middleware.
6. Payouts: keys must come from the client's own Stripe account (test keys `pk_test_/sk_test_` for build, live keys at launch). Never a WooPayments key.

Pros: no WordPress change beyond REST keys and shipping zones; the whole UI lives in Next.js; one integration yields cards + Apple/Google Pay + Klarna + Clearpay + PayPal(Stripe) + Link; standard Stripe docs and test mode. Cons: we own totals reconciliation (REST order vs Store API), two sources of truth for the order lifecycle (Stripe webhook → Woo), refunds are done in Stripe then mirrored, Woo stock is reduced only on `set_paid`; the stale-cart/double-order edge cases (back button, second tab) must be guarded by the idempotency key and by marking the Cart-Token cart as consumed (`DELETE`-equivalent: remove all items) after success.

### (c) PayPal, Klarna, Clearpay parity

- **Stripe Payment Element / Express Checkout Element (both (a) and (b))**: Klarna (business location GB supported; GBP; UK options Pay in full 0–4,000, Pay later 1–1,500, Pay in 3 1–2,000, Financing 250–5,000), **Clearpay** (= Afterpay in GB; Pay in 4, GBP 1–1,200; Payment Element and Checkout only, *not* the Express Checkout Element; domestic UK customers only), **PayPal via Stripe** (GB is a listed business location; EUR/GBP/… ; "activate PayPal payments" in the Dashboard; settlement to Stripe or to a linked PayPal account; refunds up to 180 days). All three are redirect flows, so `return_url` is mandatory and fulfilment must follow the webhook. In (a) they are the plugin's UPE sub-gateways `stripe_klarna`, `stripe_afterpay_clearpay`, `stripe_paypal` (must be enabled in the plugin settings as well as in Stripe).
- **Keeping the client's existing PayPal business account** (what the live site uses): (b) can add `@paypal/react-paypal-js` buttons that create/capture a PayPal order on our server with the client's REST client id/secret, then create/mark-paid the Woo order the same way; (a) cannot drive `ppcp-gateway` from another origin without server-side shims. If the client is happy to settle PayPal through Stripe, use Stripe's PayPal and avoid a second SDK.
- Google Pay today is PayPal's; after the switch it is Stripe's (Express Checkout Element), which also needs the domain registration above.

### (d) Environment, CSP and repo touch-points

Env (Vercel project + `.env.local`): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_/pk_live_), `STRIPE_SECRET_KEY` (sk_…, server only), `STRIPE_WEBHOOK_SECRET` (whsec_, one per endpoint and per mode), `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` (Read/Write key from WooCommerce → Settings → Advanced → REST API; permalinks must not be "Plain"; Basic auth over HTTPS; some shared hosts strip `Authorization` — fall back to query-string auth), existing `NEXT_PUBLIC_WC_BASE`, `NEXT_PUBLIC_SITE_URL`; optional `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`NEXT_PUBLIC_PAYPAL_CLIENT_ID` for (c). Packages: `@stripe/stripe-js` is already in `package.json` (10.2.1); add `@stripe/react-stripe-js` and `stripe` (server).

CSP additions in `next.config.ts` (current policy only allows self + wdlocks.co.uk; `frame-src` is OpenStreetMap only; `Permissions-Policy: payment=()` must become `payment=(self "https://js.stripe.com")` for Apple/Google Pay):
`script-src … https://js.stripe.com https://*.js.stripe.com https://m.stripe.network`; `connect-src … https://api.stripe.com https://m.stripe.network https://q.stripe.com https://r.stripe.com`; `frame-src https://www.openstreetmap.org https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://checkout.stripe.com`; `img-src … https://*.stripe.com`. PayPal JS SDK additionally: `script-src https://www.paypal.com https://www.sandbox.paypal.com`, `frame-src https://www.paypal.com https://www.sandbox.paypal.com`, `connect-src https://www.paypal.com https://api-m.paypal.com https://www.sandbox.paypal.com`, `img-src https://www.paypalobjects.com`.

Repo today: `src/app/checkout/page.tsx` is a review page (`CheckoutReview`) that hands the basket to wdlocks.co.uk (`src/lib/checkout.ts`, native single-line mode or the `backend/wd-cart-handoff.php` mu-plugin); `src/lib/cart-proxy.ts` keeps the Cart-Token; `src/lib/delivery.ts` estimates arrival dates; `docs/basket-checkout-replication-spec.md` describes the intended Ultion-like layout.

## 4. Recommendation

Build **(b) Stripe-in-Next.js with WC REST order creation first**, keeping (a) as the fallback if the client prefers Woo-managed refunds and installs the Stripe plugin — the client-side Payment Element / Express Checkout Element code is the same in both, only the server glue differs. Reasons: no plugin install or theme change on the shared-hosting WordPress is needed (only a REST key); the live gateway is PayPal, so there is no existing Stripe plugin contract to reuse anyway; everything is testable end-to-end in Stripe test mode from Vercel preview deployments; it finally removes the cross-domain handoff and the `/cart/` 404 from the customer journey.

Build order (routes, components, server):
1. `src/lib/stripe.ts` (server `stripe` client, API version pinned) and `src/lib/wc-rest.ts` (Basic-auth fetch, `createOrder`, `updateOrder`, `markPaid`, zod-validated types). Env wiring + CSP + `Permissions-Policy` change.
2. Cart routes: `POST /api/cart/customer` (→ `update-customer`), `POST /api/cart/shipping` (→ `select-shipping-rate`), `POST /api/cart/coupon` (apply/remove), all via `proxyCartRequest`. Return the cart so the UI re-renders totals.
3. `src/app/checkout/page.tsx` → two-column checkout: left `ContactForm` (email, phone), `AddressForm` (GB first; postcode lookup later), `ShippingOptions` (radio list from `shipping_rates`, arrival text from `delivery.ts`), `PaymentSection` (`ExpressCheckoutElement` on top, `PaymentElement` below, terms checkbox with the live wording, "Place order" button); right `OrderSummary` (lines, qty, subtotal, delivery, VAT line, total, coupon). `noindex`. Keep `CheckoutReview` behind a feature flag (`NEXT_PUBLIC_CHECKOUT_MODE=handoff|stripe`) until launch.
4. `POST /api/checkout/intent` (create Woo order + PaymentIntent, idempotent, totals check), `GET /api/checkout/status?order&key` (reads the Woo order status), `POST /api/stripe/webhook` (raw body, signature, dedupe, mark paid / failed / refunded), `src/app/checkout/return/page.tsx` (handles `payment_intent` query, polls status, shows Woo order number), `src/app/checkout/thank-you/[order]/page.tsx`.
5. After success: clear the Store API cart via the proxy, drop the `wd_cart` marker cookie, fire GA/FB events if the site uses them.
6. PayPal: enable PayPal in the client's Stripe Dashboard (GB) so it appears in both Elements; only add the PayPal JS SDK if the client insists on settling through their own PayPal account.
7. Hardening: rate-limit `/api/checkout/intent`, log Stripe `request_id`s, add a daily reconciliation script (Stripe PaymentIntents vs Woo orders with `created_via: headless`).

Test strategy (never live money): client creates a **sandbox/test key pair** in their Stripe account and a test-mode webhook pointing at the Vercel preview URL (`whsec_` per environment; `stripe listen --forward-to localhost:3000/api/stripe/webhook` locally; `stripe trigger payment_intent.succeeded`). Register the preview domain under Payment method domains (test). Cards: `4242 4242 4242 4242` success, `4000 0025 0000 3155` 3DS challenge, `4000 0000 0000 9995` insufficient funds, `4000 0000 0000 0002` generic decline, `4000 0082 6000 0000` GB Visa; any future expiry, any CVC. Klarna/Clearpay/PayPal in test mode show Stripe's simulated redirect page with Authorize / Fail buttons; Apple Pay/Google Pay test with a real wallet holding a test card in a sandbox-registered domain. Woo side: a staging copy is ideal; otherwise test orders land in the live Woo as `pending`/`processing` with `created_via: headless` and a `test_mode` meta flag, and are cancelled afterwards (no stock sold; a test-mode PaymentIntent never charges). Playwright e2e: happy path, 3DS, decline, coupon, shipping switch, back-button double-submit, webhook replay (same `event.id` twice).

What to request from the client:
1. Confirm which Stripe account will receive payouts: an existing standalone Stripe account (keys from Developers → API keys) or a new one; WooPayments cannot be used. Test-mode and live `pk_`/`sk_` keys, and permission to create webhook endpoints (or they create them: events `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.processing`, `charge.refunded`; URL `https://<site>/api/stripe/webhook`) and share the `whsec_`.
2. In Stripe Dashboard → Payment methods: turn on Cards, Apple Pay, Google Pay, Link, Klarna, Clearpay, PayPal (activate), optionally Revolut Pay / Bacs; add the production and preview domains under Payment method domains.
3. WooCommerce REST API key (Read/Write) for a dedicated "Headless checkout" user; confirm permalinks are not Plain and that `Authorization` headers reach PHP on their host.
4. Shipping zones: confirm the three flat rates (ids `flat_rate:1/2/3`, GB only?), any free-shipping threshold, and whether non-GB addresses should be refused.
5. Decide PayPal: through Stripe (recommended) or keep the PayPal business account (then PayPal REST client id/secret, sandbox + live). Decide whether Trustly is needed (not available via Stripe; drop or keep via PayPal).
6. Optional for approach (a): install `WooCommerce Stripe Gateway`, connect it to the same account, enable Klarna/Clearpay/PayPal sub-gateways, and tell us the publishable key; the Store API checkout endpoint is already enabled, so no further WP change is needed.
7. Copy of the terms/privacy wording and the order-confirmation email template to keep the same content; VAT number for receipts.

## 5. Rollout stages (12 Nov 2026) — "step wise, dummy cards first"

Pritam has access to the client's Stripe account (`acct_1UadEbAi3njqKy9r`). The checkout goes live in three stages, each
switched purely by which keys are present (`scripts/stripe-setup.mjs` validates the keys, registers the webhook and
pushes them to Vercel; nothing else changes between stages).

| Stage | Where | Keys | What happens | Who sees it |
|---|---|---|---|---|
| 0 (today) | production wdlocks-frontend.vercel.app | none (`NEXT_PUBLIC_CHECKOUT_MODE=demo`) | pretend provider, pretend orders | everyone — nothing is charged |
| **1 sandbox** ✅ 12 Nov | **staging** wdlocks-frontend-staging.vercel.app | `pk_test_` + `sk_test_` + `whsec_` | real Stripe Payment Element in **test mode**, Stripe's dummy cards, real test-mode PaymentIntents; the order stays a pretend one (cookie), WooCommerce untouched | Pritam + Paramjit, on any phone (no login wall, `noindex`) |
| 2 orders ✅ 12 Nov | staging | + `ck_`/`cs_` WooCommerce REST key | test-card orders appear in the WooCommerce admin as `pending` → `processing`, marked by the webhook; test orders are cancelled afterwards | same |
| 3 live | production | `pk_live_` + `sk_live_` + `whsec_` + `ck_`/`cs_` | real money; Apple Pay / Google Pay need the production domain registered under Payment method domains | shoppers |

Staging is its own Vercel project (`wdlocks-frontend-staging`, deployed from the `staging` branch via the git worktree
`../wdlocks-frontend-staging`): preview deployments on this plan sit behind Vercel Authentication, which neither the
client's phone nor Stripe's webhook can pass. `IS_STAGING` (derived from `NEXT_PUBLIC_SITE_URL`) makes robots and the
page metadata `noindex`.

Code path per stage (`src/lib/demo-checkout.ts` `isStripeSandbox()`): with Stripe keys but no WooCommerce key and
`NEXT_PUBLIC_CHECKOUT_MODE=demo`, `/api/checkout/intent` creates a real test-mode PaymentIntent (metadata
`sandbox=true`, `demo_order_id`) for the cookie order, `/api/checkout/status` reads the intent's status back
(succeeded → processing/paid, requires_payment_method with an error → failed), and `/api/stripe/webhook` verifies the
signature and acknowledges with `{ sandbox: true }` since there is no order to update. The checkout shows a "Test
mode" banner whenever the publishable key starts with `pk_test_`.

Runbook:
1. Stripe Dashboard (test mode on) → Developers → API keys: copy the publishable and secret test keys into
   `.env.local` (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`). Keys never go through chat.
2. `node scripts/stripe-setup.mjs --target staging` → checks the keys, creates the webhook endpoint for
   `https://wdlocks-frontend-staging.vercel.app/api/stripe/webhook` (writes `STRIPE_WEBHOOK_SECRET` back), pushes
   the variables to the staging project.
3. `cd ../wdlocks-frontend-staging && git merge main && vercel deploy --prod --yes`, then pay on staging with
   `4242 4242 4242 4242` (any future expiry, any CVC); `4000 0000 0000 0002` declined; `4000 0025 0000 3155` 3-D Secure.
   Payments appear in the Stripe Dashboard (test mode) → Payments.
4. Stage 2: WooCommerce → Settings → Advanced → REST API → Add key (Read/Write) into `.env.local`
   (`WC_CONSUMER_KEY/SECRET`), rerun step 2 and 3.
5. Stage 3: live keys in `.env.local`, `node scripts/stripe-setup.mjs --target production`, `vercel deploy --prod --yes`,
   register the domain for Apple Pay / Google Pay, remove `NEXT_PUBLIC_CHECKOUT_MODE` from production.

