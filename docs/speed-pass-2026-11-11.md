# Speed pass — 11 Nov 2026

What was slow, what changed, and what is still slow. Measurements are from `docs/performance-audit-2026-11-11.md`
(before) and Playwright timing scripts run against production after each deploy.

## Before

| Symptom | Measured | Cause |
|---|---|---|
| Basket drawer after "Buy now" / "Add to basket" | 2.3–2.8 s | `useCart.addToCart` awaited the Store API round trip before opening the drawer |
| Every basket call (add, update, remove, mount GET) | 1.9–2.5 s via Vercel | WordPress on shared hosting answers in ~1.05 s at best (no object cache); the first POST also did a bootstrap GET (two round trips); ~0.8–1.3 s unexplained inside the Vercel→wdlocks.co.uk hop |
| First load, mobile | Lighthouse 68–94, LCP 2.6–4.0 s, 6.2 MB | hero film 3.4 MB + exploded clip 1.3 MB both `preload="auto"`, 9-product JSON twice in the RSC payload (226 KB), LCP poster without priority |
| Occasional empty product grid ("temporarily unavailable") | seen by the e2e suite | a Store API failure during an ISR refresh cached an empty catalogue for 60 s |

## After (production, 11 Nov)

| Change | File(s) | Effect |
|---|---|---|
| Optimistic add: drawer opens with a provisional line, server cart replaces it, rollback + toast on failure | `src/lib/cart-optimistic.ts`, `src/hooks/useCart.tsx`, callers | click → drawer **~80 ms** (was 2.3–2.8 s); the Store API call (~2 s) runs behind it |
| Session warm-up on idle (4 s after load) and on hover/focus of a buy button, and on product pages | `useCart.warmSession`, `ProductCard`, `AddToCart`, `VariationSelector` | first add needs one upstream call instead of two |
| No mount-time cart fetch for visitors without a basket (readable marker cookie `wd_cart` set beside the httpOnly token) | `src/lib/cart-proxy.ts`, `useCart` | one fewer function call + WordPress hit per first visit |
| Catalogue retry + last-good fallback; fallback copy no longer links to the old shop | `src/lib/api.ts`, `ProductGrid` | no more cached empty grids |
| Trimmed product objects for the layout (menus, basket upsells) | `getMenuProductsSSR` in `src/lib/api.ts` | smaller RSC payload on every page |
| Hero film re-encoded 960×768 @ ~1.05 Mbit/s (2.0 MB, was 3.4 MB); exploded clip `preload="none"` until within one screen; phones/data-saver get posters only; LCP poster `fetchpriority=high` | `public/brand/video/hero-inside.mp4`, `ExplodedFilm`, `HeroBackdrop` | cold home download roughly halved on desktop, ~5 MB less on phones |
| Image optimiser cache 31 days, single quality; `/brand/*` cached a week in browsers | `next.config.ts` | fewer re-transformations and revalidations |
| `Server-Timing: upstream;dur=…` on every `/api/cart` response | `src/lib/cart-proxy.ts` | DevTools → Timing shows how much of a basket call was WordPress |

## Still slow, and whose problem it is

- **WordPress itself (~1.05 s per Store API call).** The host has no object cache and the REST responses are
  `no-store`. Options for the client: enable a persistent object cache (Redis/Memcached on the 20i plan) and OPcache,
  remove the Facebook pixel / tracking plugins from REST requests, and add `Cache-Control` on `/wp-content/uploads`.
  Nothing on our side can make that call faster; we can only avoid it (done) or hide it (done).
- **Vercel → wdlocks.co.uk hop (~0.8–1.3 s extra).** Watch the new `Server-Timing` header: if `upstream` is much
  larger than the ~1.05 s measured directly, ask the host whether datacenter IPs are rate-limited or whether IPv6 is
  misrouted (the domain has an AAAA record). Forcing IPv4 is possible with a custom dispatcher if that is confirmed.
- **framer-motion (48 KB gz, mostly unused at load).** Used by the modal, toasts and a few reveals. Replacing it with
  CSS transitions would be the next bundle win.
- **Product photos on white JPEGs.** Rim cylinder, both keys, keyed-alike and Bruno show white rectangles on the
  grey tiles. Needs cut-out PNG/WebP exports from the client (asset request, not code).

## Media hosting (summary of `media-hosting-research.md`)

Keep product images in WooCommerce served through `next/image` (10–50 KB AVIF from London edge, cache HIT ~35 ms)
and brand films in `/public` on Vercel (edge cached, Range requests honoured). None of Cloudinary, imgix, Cloudflare
Images, Bunny or Vercel Blob would be faster or smaller here; they would add sync and DNS work. The shop must be on
Vercel Pro (Hobby is non-commercial and caps image transformations). Re-encode and lazy-load films (done for the
two heaviest), move the 7.3 MB brochure PDF out of `/public`, and revisit only if traffic grows past ~1 TB/month.

## Addendum, 11 Nov: demo checkout

Pritam asked for the checkout to be clickable without waiting for keys ("implement with dummy"). `NEXT_PUBLIC_CHECKOUT_MODE=demo`
is set on Vercel production: `/checkout` now shows the on-site checkout with a pretend payment step (card fields and
wallet/PayPal/Klarna tabs), `/api/checkout/intent` issues a demo order in a signed cookie, `/api/checkout/demo` flips it
to paid or declined, and the return page shows the confirmation. Product-page "Buy now" goes to `/checkout` instead of
wdlocks.co.uk while a non-handoff mode is active. Remove the variable (or add real keys) to go back.
