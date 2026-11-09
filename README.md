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
| EXTRA_KEYS_3 | 4266 | simple | *(brief said variable; live store is simple)* |
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
wdlocks.co.uk. Linking straight to `/checkout/` would show an empty basket. `src/lib/checkout.ts` therefore
re-adds the lines on arrival using WooCommerce's native add-to-cart URL:

```
https://wdlocks.co.uk/checkout/?add-to-cart=5168&quantity=1&wd_items=4384:2,5137:1
```

* **One line in the basket** — works today with no backend change (`add-to-cart` accepts variation IDs).
* **Two or more lines** — WooCommerce core handles only one `add-to-cart` per request. Install
  `backend/wd-cart-handoff.php` as a must-use plugin (`wp-content/mu-plugins/`) and every line is carried
  over and the URL is cleaned so a refresh can't double-add. **Without it, only the first line reaches checkout.**

Longer term, replace the redirect with a native checkout (Store API `/checkout` + Stripe; `@stripe/stripe-js`
is already installed).

## Deployment (Vercel)

1. Import the GitHub repo, framework preset *Next.js*.
2. Set `NEXT_PUBLIC_SITE_URL` to the production domain and `NEXT_PUBLIC_WC_BASE=https://wdlocks.co.uk`
   (the placeholders in `vercel.json` are documentation; dashboard values win).
3. Add the domain; `next.config.ts` already sends CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy and
   redirects `/shop` → `/products`, `/product/:slug` → `/products/:slug`.

## Known TODOs

- Confirm the Trustpilot profile URL (`TRUSTPILOT_URL` in `constants.ts`) and the free-delivery threshold.
- Install the mu-plugin above, or build the native checkout, before accepting multi-line baskets.
- `script-src 'unsafe-inline'` in the CSP is required by static generation; move to nonces if routes go dynamic.
- Reviews section links out to Trustpilot rather than embedding quotes — wire up the Trustpilot widget.
- Product descriptions are raw WooCommerce HTML (sanitised) — images inside them are plain `<img>` tags.
