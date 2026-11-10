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
    layout/   AnnouncementBar, Navbar (+MegaMenu, MobileMenu), Footer, Logo, RootLayout
    product/  ProductCard, ProductGrid, SizePicker, VariationSelector, ProductGallery, AddToCart, Breadcrumb
    cart/     CartDrawer, CartLineItem, QuantityControl
    home/     Hero, TrustStrip, WhyWatchdog, Reviews, Delivery
    ui/       Button, Modal, Toast, Skeleton, ErrorBoundary
  hooks/      useCart (context + optimistic updates), useProducts (SWR)
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
- Rate-limit `/api/cart/*` (Vercel WAF or `@upstash/ratelimit`); it is an open proxy to wdlocks.co.uk.
- Replace the regex HTML sanitiser with `sanitize-html`/DOMPurify, or move to a nonce-based CSP.
- `script-src 'unsafe-inline'` in the CSP is required by static generation; move to nonces if routes go dynamic.
- **PENDING — Reviews (parked 2026-11-10):** the reviews section links out via `TRUSTPILOT_URL` and asserts no rating.
  Once the client picks a source (Trustpilot / Google / Checkatrade) and confirms the profile URL, embed the widget
  with the live rating. Do not hard-code quotes.
- Product descriptions are raw WooCommerce HTML (sanitised) — images inside them are plain `<img>` tags.
