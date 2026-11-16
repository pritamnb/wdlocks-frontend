# WD Locks — headless storefront

Next.js frontend for [wdlocks.co.uk](https://wdlocks.co.uk). WooCommerce stays live as the backend: products
come from the public Store API, the basket is proxied through Next.js route handlers, and checkout hands over
to the existing WooCommerce checkout.

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 (CSS-first theme in `src/app/globals.css`), framer-motion |
| Data | WooCommerce Store API v1 — `https://wdlocks.co.uk/wp-json/wc/store/v1` (public, no auth) |
| Cart | Store API `Cart-Token` session held in an httpOnly cookie on this domain, via `/api/cart/*` |
| Checkout | Redirect to `https://wdlocks.co.uk/checkout/` (see **Checkout handoff**) |
| Hosting | Vercel (`vercel.json`), region `lhr1` |

## Getting started

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Environment variables (all public, no secrets):

| Variable | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL of this frontend (metadata, sitemap, OG) | `https://shop.example.co.uk` |
| `NEXT_PUBLIC_WC_BASE` | WooCommerce origin | `https://wdlocks.co.uk` |
| `NEXT_PUBLIC_CART_HANDOFF_PLUGIN` | `true` once `backend/wd-cart-handoff.php` is installed on WordPress (enables multi-line checkout) | `false` |
| `RESEND_API_KEY` | Resend API key; when set, the contact page's callback and message forms are emailed to `CONTACT_TO` (default sales@wdlocks.co.uk) from `CONTACT_FROM` (default `Watchdog Locks <noreply@wdlocks.co.uk>`, a domain verified in Resend). Unset: the forms open the visitor's mail app instead | — |

## Project structure

```
src/
  app/
    layout.tsx                  root layout: fonts (Inter + Playfair Display), metadata, site chrome
    page.tsx                    homepage (hero, trust strip, product grid, why, reviews, delivery)
    products/page.tsx           all products
    products/[slug]/page.tsx    product detail (static params for all 9 products, ISR 60s)
    api/cart/route.ts           GET    basket
    api/cart/add/route.ts       POST   { id, quantity, variation? }
    api/cart/update/route.ts    PUT    { key, quantity }
    api/cart/remove/route.ts    DELETE { key }
    api/cart/clear/route.ts     DELETE        (empties the basket on checkout handoff)
    sitemap.ts · robots.ts · opengraph-image.tsx · not-found.tsx · error.tsx
  components/
    layout/   AnnouncementBar, Navbar (+MegaMenu, MobileMenu), Footer (+CookieSettingsLink), CookieConsent, Logo, RootLayout
    product/  ProductCard, ProductGrid, SizePicker, VariationSelector, ProductGallery, AddToCart, Breadcrumb
    cart/     CartDrawer, CartLineItem, QuantityControl
    home/     Hero, TrustStrip, WhyWatchdog, Reviews, Delivery
    ui/       Button, Modal, Toast, Skeleton, ErrorBoundary
  hooks/      useCart (context + optimistic updates), useConsent (cookie choice, `wd:consent`), useProducts (SWR)
  lib/
    constants.ts     design tokens, catalogue (9 products), all 31 variation IDs, site info
    wdlocks-api.ts   Store API product client + money formatting (pence → £)
    api.ts           server-side SSR helpers (revalidate: 60)
    cart-client.ts   browser → /api/cart/* helpers
    cart-proxy.ts    server → Store API proxy (Cart-Token + cookie forwarding, validation)
    checkout.ts      builds the checkout handoff URL
    product-helpers.ts · sanitize.ts · fonts.ts · cn.ts
  types/index.ts     Store API v1 response types
backend/
  wd-cart-handoff.php   optional WordPress mu-plugin (see below)
```

## Catalogue

| Key | ID | Type | Variations |
|---|---|---|---|
| CYLINDER_LOCK | 5141 | variable | 17 sizes (`CYLINDER_SIZES`) e.g. 35/35 → 5168, 35/50 → 5193, 35/55 → 6085, 45/45 → 5169, 45/55 → 5171 |
| THUMB_TURN | 5077 | variable | 12 sizes (`THUMB_SIZES`) |
| RIM_CYLINDER | 5112 | variable | Brass 5137 · Nickel 5138 |
| HALF_CYLINDER | 3861 | simple | |
| LUBRICANT | 4384 | simple | |
| EXTRA_KEYS_3 | 4266 | simple | *(brief said variable; live store is simple)* — **requires an "Existing Key Number" field the Store API can't send, so the UI links to the WooCommerce product page** |
| EXTRA_KEYS_1 | 6062 | simple | |
| KEYED_ALIKE | 5642 | simple | |
| BRUNO_TEDDY | 5565 | simple | |

Prices from the Store API are strings in **pence** (`"3499"` = £34.99) and include VAT. Cart line totals
(`line_subtotal`) are **ex-VAT**; the UI always shows `line_subtotal + line_subtotal_tax` so the basket matches
the prices on the cards.

## How the cart works

1. Browser calls `/api/cart/*` with `credentials: 'include'`.
2. The route handler reads our `wd_cart_token` httpOnly cookie and forwards it upstream as the `Cart-Token`
   header (Store API cart mutations need either a nonce or a Cart-Token; the token route needs no nonce).
3. The upstream response's `Cart-Token` header is written back into the cookie; any `wp_woocommerce_session_*`
   / `woocommerce_*` `Set-Cookie` headers are rewritten to our origin and forwarded too.
4. Inputs are validated: product/variation IDs must be in the catalogue allow-list, quantities 1–99, cart keys
   32-hex. The upstream URL is a fixed host + one of four literal paths, so there is no SSRF surface.

Why not call wdlocks.co.uk from the browser? It returns no `Access-Control-Allow-Origin` for foreign origins,
and the WooCommerce session cookie would be a blocked third-party cookie anyway.

## Checkout handoff — READ BEFORE GO-LIVE

The basket session lives behind our proxy; the shopper's browser has **no** WooCommerce cookie for
wdlocks.co.uk, so linking straight to `/checkout/` would show an empty basket. `src/lib/checkout.ts`
re-creates the basket on arrival, and the headless basket is emptied at the same moment (so a returning
shopper cannot re-send it). Two modes:

| Mode | URL sent | Lines | Refresh-safe | Needs |
|---|---|---|---|---|
| **Plugin** (`NEXT_PUBLIC_CART_HANDOFF_PLUGIN=true`) | `/checkout/?wd_items=5168:1,4384:2` | any | yes — plugin *replaces* the WC basket then redirects to a clean URL | `backend/wd-cart-handoff.php` in `wp-content/mu-plugins/` |
| **Native** (default) | `/checkout/?add-to-cart=5168&quantity=1` | **one line only** (drawer blocks checkout for more and explains why) | no — WooCommerce leaves the query string, a refresh re-adds the line | nothing |

**Recommended for launch: install the mu-plugin and switch the flag to `true`.** It is ~60 lines of PHP,
auto-activates, and makes the handoff idempotent for any basket. Longer term, replace the redirect with a
native checkout (Store API `/checkout` + Stripe; `@stripe/stripe-js` is already installed).

## Checkout on our domain (Stripe)

### Demo mode (no keys needed)

`NEXT_PUBLIC_CHECKOUT_MODE=demo` runs the whole on-site checkout against a pretend payment provider: the Stripe
Payment Element is replaced by a look-alike (card fields plus Apple Pay / Google Pay / PayPal / Klarna tabs), the
"order" lives in a signed cookie, nothing is charged and nothing reaches WooCommerce. Test cards: `4242 4242 4242 4242`
pays, `4000 0000 0000 0002` declines, `4000 0025 0000 3155` shows a 3-D Secure style challenge. The mode is ignored as
soon as real Stripe keys are set. Production is currently in demo mode so the flow can be reviewed end to end.

### Live mode (Stripe + WooCommerce REST)

Server side of `docs/stripe-checkout-plan.md` approach (b): the basket stays in the Store API, the order is
created through the WooCommerce REST API, and the card/wallet payment is a Stripe PaymentIntent confirmed on
this domain. Without the env vars below every checkout route answers `503 { code: 'not-configured' }` and the
UI falls back to the handoff above. Implementation notes: `docs/stripe-checkout-server-notes.md`.

| Env var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | browser | `loadStripe()` for Elements (pk_test_/pk_live_) |
| `STRIPE_SECRET_KEY` | server | PaymentIntents (sk_test_/sk_live_, the client's own account, never WooPayments) |
| `STRIPE_WEBHOOK_SECRET` | server | `whsec_` for the endpoint below (one per environment and mode) |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | server | WooCommerce REST Read/Write key used to create and update orders |

All server secrets are read in `src/lib/server-env.ts` only.

Routes (all `force-dynamic`, Node runtime, `no-store`):

| Route | Upstream | Notes |
|---|---|---|
| `POST /api/cart/customer` | Store API `cart/update-customer` | billing (+ optional shipping) address → cart with shipping rates / VAT |
| `POST /api/cart/shipping` | Store API `cart/select-shipping-rate` | `{ package_id, rate_id }` |
| `POST` / `DELETE /api/cart/coupon` | Store API `cart/apply-coupon` / `remove-coupon` | `{ code }` |
| `POST /api/checkout/intent` | WC REST `orders` + Stripe | re-reads the basket, creates/reuses a `pending` order, returns `clientSecret`; `409 total_mismatch` if the total moved; rate limited and Turnstile-checked (see Abuse protection) |
| `GET /api/checkout/status?order=&key=` | WC REST `orders/{id}` | status/paid for the return page; the order key is the secret |
| `POST /api/stripe/webhook` | Stripe → WC REST | marks orders paid / failed / on-hold, notes refunds |

Webhook: URL `https://<site>/api/stripe/webhook`, events `payment_intent.succeeded`,
`payment_intent.payment_failed`, `payment_intent.processing`, `charge.refunded`. Locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints the whsec_ to put in .env.local
stripe trigger payment_intent.succeeded
```

Test cards: `4242 4242 4242 4242` (success), `4000 0025 0000 3155` (3DS), `4000 0000 0000 9995` (declined).
Test orders land in WooCommerce as `pending` → `processing` with meta `_headless_site = wdlocks-frontend`.

## Abuse protection

Place order creates a real WooCommerce order and a Stripe PaymentIntent, and the forms send email or post to
wdlocks.co.uk, so every write route is rate limited per IP and (once keys are added) bot-checked.

Everything here is switched and tuned with environment variables, so day-to-day changes (provider, limits, which
forms are checked, the proxy setting) are a settings change and a restart, never a code change. See "Changing it
without code" below.

**Rate limits** (`src/lib/rate-limit.ts`), fixed windows per client IP, `429` + `Retry-After`. Defaults:

| Route | Default limits | Override |
|---|---|---|
| `POST /api/checkout/intent` | 10 / min, 30 / hour | `RATE_LIMIT_CHECKOUT_INTENT` |
| `POST /api/checkout/coupon` | 8 / min, 40 / hour | `RATE_LIMIT_CHECKOUT_COUPON` |
| `POST /api/contact` | 5 / 10 min, 20 / day | `RATE_LIMIT_CONTACT` |
| `POST /api/trade` | 3 / 10 min, 10 / day | `RATE_LIMIT_TRADE` |
| `POST /api/guarantee` | 10 / 10 min, 50 / day | `RATE_LIMIT_GUARANTEE` |
| `POST /api/crime` | 20 / min, 200 / day | `RATE_LIMIT_CRIME` |

An override is up to four `count/window` pairs, units `s` `m` `h` `d` (`5/10m,20/1d`; `10/m` means per minute), or
`off` to switch that route's limit off. An invalid value is logged and the defaults stay in force, so a typo never
removes protection. Windows can be at most 7 days, and each pair needs a different window length.

**Store.** Counters live in a shared Redis over the Upstash REST protocol when `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` are set (Vercel's Upstash integration sets `KV_REST_API_URL` + `KV_REST_API_TOKEN`,
also accepted). Without those vars, or if the store does not answer within 800 ms, each server instance counts in
its own memory (logged once a minute). IPs are stored as an HMAC, never in clear, and expire with their window. The
protocol is an open HTTP API, so the provider can change by changing the two values:

| Provider | URL / token |
|---|---|
| Upstash (recommended: free tier, HTTPS, any host) | the database's REST URL and token from the Upstash console |
| Vercel KV / Upstash via the Vercel marketplace | nothing: Vercel sets `KV_REST_API_URL` + `KV_REST_API_TOKEN` |
| Your own Redis (on the host, Redis Cloud, ElastiCache…) | run [serverless-redis-http](https://github.com/hiett/serverless-redis-http) next to it and point the URL at it with its `SRH_TOKEN`. Plain `http://` is accepted only for loopback, private (10/172.16–31/192.168) addresses and single-label hostnames such as a Docker service `srh`; anything else must be `https://` |

A single long-running `next start` process already counts every request in one place, so a store is needed only once
the site runs as several processes or instances (PM2 cluster, several containers, serverless).

**Client IP** (`src/lib/client-ip.ts`). The first `X-Forwarded-For` entry is written by the visitor and is never used.

| Host | Setting |
|---|---|
| Vercel | nothing: `VERCEL=1` is set by the platform, the IP comes from `x-vercel-forwarded-for` / `x-real-ip` |
| Behind Cloudflare | `CLIENT_IP_HEADER=cf-connecting-ip` (only if the origin accepts traffic from Cloudflare alone) |
| nginx / Apache / a PaaS router in front of `next start` | `CLIENT_IP_HEADER=x-real-ip` if the proxy **overwrites** that header with the peer address (nginx `proxy_set_header X-Real-IP $remote_addr;`), otherwise leave it unset and set `TRUSTED_PROXY_COUNT` to the number of proxies that **append** to `X-Forwarded-For` (default `1`) |

**Tomia (client host).** Where the Next.js app will run on Tomia's side is still open (WP Engine Headless Platform
or another Node host). Before launch, ask Tomia which header their front proxy sets and pick a row above; if they
cannot say, leave `CLIENT_IP_HEADER` unset with `TRUSTED_PROXY_COUNT=1` and test: send
`curl -X POST https://<site>/api/crime -H 'Content-Type: application/json' -H 'X-Forwarded-For: 198.51.100.1' -d '{}'`
21 times within a minute, changing the made-up address each time. The 21st must still answer `429`; if it does
not, the setting trusts a header the visitor controls. Never expose `next start` directly: with no proxy in front,
the visitor's own `X-Forwarded-For` is all there is.

**Turnstile** (Cloudflare's bot check): `src/hooks/useTurnstile.tsx` in the browser, `src/lib/turnstile.ts` in the
routes. Covers Place order (`/api/checkout/intent`) and the contact, trade and guarantee forms; the token travels in
the `X-Turnstile-Token` header and each form has its own `action`. Switched on only when **both**
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` (build time) and `TURNSTILE_SECRET_KEY` are set; with either missing the forms
work exactly as before. The widget is invisible unless Cloudflare wants a click, and the script loads only on pages
with a protected form. It is a security measure for the visitor's own request, so it is "essential" in the cookie
popup and runs whatever the visitor chose. If Cloudflare's verify endpoint is unreachable the route lets the request
through (logged) rather than stopping sales; the rate limits still apply. Cloudflare's test keys (site
`1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`; secret `2x0000000000000000000000000000000AA`
always fails) are fine for local runs and staging.

`NEXT_PUBLIC_TURNSTILE_FORMS` picks which forms are checked: any of `checkout`, `contact`, `trade`, `guarantee`, or
`all` / `none` (default all). Like the site key it is read at build time, so changing it needs a rebuild, not a code
change; an unknown name means all forms (logged by the server).

**Changing it without code**

| To… | Set | Takes effect |
|---|---|---|
| use a shared store / switch provider | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`) | restart |
| go back to per-instance memory | remove those two | restart |
| tighten or loosen a route | `RATE_LIMIT_<ROUTE>=count/window,…` | restart |
| switch a route's limit off | `RATE_LIMIT_<ROUTE>=off` | restart |
| move host / proxy | `CLIENT_IP_HEADER` or `TRUSTED_PROXY_COUNT` (nothing on Vercel) | restart |
| turn Turnstile on | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | rebuild |
| stop enforcing Turnstile at once | remove `TURNSTILE_SECRET_KEY` (the widget keeps running until the next build) | restart |
| check only some forms | `NEXT_PUBLIC_TURNSTILE_FORMS=checkout,contact` | rebuild |
| rotate Turnstile or store keys | new values in the same vars | restart (rebuild for the site key) |

Code changes are needed only to protect a NEW route or form (one `rateLimit()` / `verifyTurnstile()` call plus a
default in `RATE_LIMITS` or `TURNSTILE_FORMS`).

**Stripe Radar** rules for card testing: `docs/stripe-radar-rules.md` (recommendations only; nothing is changed in
the Stripe account from this repo).

## Deployment (Vercel)

1. Import the GitHub repo, framework preset *Next.js*.
2. Set `NEXT_PUBLIC_SITE_URL` to the production domain and `NEXT_PUBLIC_WC_BASE=https://wdlocks.co.uk`
   (the placeholders in `vercel.json` are documentation; dashboard values win).
3. Add the domain; `next.config.ts` already sends CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy and
   redirects `/shop` → `/products`, `/product/:slug` → `/products/:slug`.

## Client assets

Allegion renders live in `public/brand/product/`. The two product videos (turntable animation 58 MB, Watchdog.mp4 202 MB)
are kept outside the repo at `../client-assets/wetransfer-2026-11-10/`, and the second batch (exploded view, key renders,
£5K card, 6 s keyed-alike clip) at `../client-assets/wetransfer-2026-11-10b/WATCHDOG/`; compress before adding to the site.

## Known TODOs

- **Delivery:** the live store charges Royal Mail rates (from £6.40) — the site no longer advertises free
  delivery. If the client adds a free-shipping rule, reinstate the messaging.
- Install the mu-plugin above and set `NEXT_PUBLIC_CART_HANDOFF_PLUGIN=true` before launch.
- Extra Keys (4266) orders go to wdlocks.co.uk until a key-number field is added to the headless flow.
- Abuse protection needs its accounts before launch: an Upstash (or other) Redis for shared rate limits, Turnstile
  keys, the client-IP setting for Tomia, and the Radar rules in `docs/stripe-radar-rules.md` (see Abuse protection).
- Replace the regex HTML sanitiser with `sanitize-html`/DOMPurify, or move to a nonce-based CSP.
- `script-src 'unsafe-inline'` in the CSP is required by static generation; move to nonces if routes go dynamic.
- **PENDING — Reviews (parked 2026-11-10):** the reviews section links out via `TRUSTPILOT_URL` and asserts no rating.
  Once the client picks a source (Trustpilot / Google / Checkatrade) and confirms the profile URL, embed the widget
  with the live rating. Do not hard-code quotes.
- Product descriptions are raw WooCommerce HTML (sanitised) — images inside them are plain `<img>` tags.
