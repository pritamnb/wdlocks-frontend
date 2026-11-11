# Performance audit — wdlocks-frontend (2026-11-11)

Target: https://wdlocks-frontend.vercel.app (Next 16.4.6, React 19.3, Tailwind v4, framer-motion 14, Vercel lhr1).
Measured from a Mac in the UK, 01:00–01:15 UTC. Raw data, scripts and the 12 Lighthouse HTML/JSON reports are in
`/private/tmp/claude-501/-Users-pritam--claude-spares-spare-Z1Xpbz/30ed1f34-b404-4477-93b7-533c3f941c7c/scratchpad/perf-audit/`
(`curl-timings*.txt`, `nav-timing.json`, `basket-latency.json`, `lh-summary.json`, `lh-*-*.report.{html,json}`, `html/`, `chunks/`).
No code was changed; nothing was bought; every test basket was emptied again (items_count 0 after each run).

## Executive summary

- **The basket is slow because every basket call is a ~2.1 s round trip, and the UI waits for it.** In the browser the POST `/api/cart/add` took **2.15–2.50 s** (6/6 runs) and the drawer became visible **2.32–2.83 s** after the click; the drawer itself appears ~30 ms after the response, so framer-motion/React are not the problem. `GET /api/cart` on mount took **1.85–2.55 s** and `DELETE /api/cart/remove` 2.03–2.32 s.
- **~1.1 s of that is WordPress itself.** Direct `curl` to `wdlocks.co.uk/wp-json/wc/store/v1/cart` with a Cart-Token: **1.04–1.13 s TTFB**, with no token (session creation) 1.96–2.28 s; `/products?per_page=1`: 1.07–1.14 s. Every Store API response is `cache-control: no-store`, `x-cdn-cache-status: MISS`, served from PHP at origin. A ~1.05 s floor for a 1-product query is WordPress boot cost (plugins/no object cache), not data volume.
- **~0.8–1.3 s is lost inside the Vercel proxy hop.** `/api/cart` from Vercel with a warm cookie: **1.87–2.40 s** vs 1.05–1.13 s direct; a `/api/cart/add` call that fails validation before any upstream fetch answers in **47–86 ms**, so function cold start is not the cause. The gap is the lambda's outbound connection to wdlocks.co.uk (fresh DNS+TCP+TLS per invocation, possible IPv6 first-try — the host has an AAAA record — or upstream treating datacenter IPs differently). Needs `Server-Timing` instrumentation to split further.
- **First load is fast on the Vercel side but heavy on media.** HTML TTFB 26–60 ms, `x-vercel-cache: HIT` (ISR works; `STALE` only at age >60 s). Lighthouse desktop = **100/100** on both pages. Lighthouse mobile home = **68 / 94 / 97** (LCP 4.0 / 3.0 / 2.6 s, TBT 812 ms in run 1), mobile PDP = **89 / 90 / 90** (LCP 3.5–3.7 s). The home page ships **6.2 MB** on first load, **5.3 MB of it mp4** (hero-inside.mp4 3.3 MB `preload=auto`, exploded.mp4 1.3 MB `preload=auto`, turntable.mp4 0.7 MB preloaded as "next" film) competing with the LCP image on mobile bandwidth.
- **JS is moderate, HTML is bloated.** 16–17 script chunks = **253–260 KB gz (778–798 KB raw)**; framer-motion is a 48 KB gz chunk that Lighthouse reports **91 % unused at load**. The HTML is 328 KB raw / 45 KB gz on home: the 226 KB RSC payload carries the full 9-product Store API JSON **twice** (`RootLayout` + `HomePage` both call `getProductsSSR()`), 18× `short_description`, plus `description` HTML for all products on every page.

## Measurements

### 1. Lighthouse 13.x (headless Chrome, 3 runs each; mobile = Moto G Power / slow 4G simulation)

| Page | Form | Score | FCP | LCP | TBT | CLS | Speed Index | Total bytes | JS bytes | Media | LCP element |
|---|---|---|---|---|---|---|---|---|---|---|---|
| / | mobile | **68 / 94 / 97** | 1.07–1.08 s | **4.00 / 3.03 / 2.57 s** | 812 / 8 / 7 ms | 0–0.002 | 2.77 / 1.29 / 1.13 s | 6,160 KB | 241 KB | 5,342 KB | `<img src=/brand/video/hero-inside-poster.jpg … blur-2xl>` (the blurred fill behind the hero video) |
| / | desktop | 100 ×3 | 0.29–0.31 s | 0.65–0.72 s | 0 | 0 | 0.58–0.64 s | 5,477–6,179 KB | 253 KB | 4,640–5,342 KB | same |
| /products/3-star-alps… | mobile | **89 / 90 / 90** | 1.07–1.09 s | **3.54–3.71 s** | 16–46 ms | 0.046 | 1.07–1.09 s | 690–718 KB | 249 KB | 0 | `<img … data-nimg=fill src=/_next/image?url=…watchdog1.png&w=1536>` |
| /products/3-star-alps… | desktop | 100 ×3 | 0.29–0.33 s | 0.69–0.75 s | 0 | 0.001 | 0.30–0.52 s | 770–777 KB | 259 KB | 0 | same |

Lighthouse findings repeated on every run: LCP image "fetchpriority=high should be applied" (fails on both pages);
`unused-javascript` 69 KB (chunk `19mlfgw6nv0ur.js` = framer-motion, 44 KB of 48 KB unused; main chunk 27 KB unused);
`total-byte-weight` 6.2 MB on home; `image-delivery` 147 KB (explainer-inline-poster.jpg 89 KB served as JPEG at 380 px for a 214 px slot;
poster JPGs are not optimised); render-blocking CSS 15 KB (~50–150 ms); legacy JS polyfills 14 KB. The mobile home run with LCP 4.0 s
shows an LCP *render delay* of 1,040 ms (main thread busy hydrating while the video starts) and 810 ms TBT.

Largest requests, home mobile: hero-inside.mp4 3,327 KB · exploded.mp4 1,277 KB · turntable.mp4 738 KB · explainer-inline-poster.jpg 89 KB ·
main chunk 72 KB · hero-inside-poster.jpg 71 KB · framer chunk 48 KB · Inter woff2 48 KB.

### 2. Playwright navigation timing (desktop 1365×900, fresh browser context each run, fast UK connection)

| Page | Run | HTML TTFB | DCL | load | LCP (PerformanceObserver) | Requests | Transferred | Scripts | `x-vercel-cache` / age |
|---|---|---|---|---|---|---|---|---|---|
| / | 1 | 42 ms | 126 | 394 | 280 ms | 58 | 6,142 KB | 16 files, 253 KB gz / 778 KB raw | STALE / 136 |
| / | 2 | 27 | 214 | 229 | 276 | 58 | 6,142 KB | " | HIT / 3 |
| / | 3 | 26 | 212 | 220 | 276 | 58 | 6,142 KB | " | HIT / 10 |
| PDP | 1 | 31 | 120 | 160 | 136 | 54 | 738 KB | 17 files, 260 KB gz / 798 KB raw | HIT / 16 |
| PDP | 2 | 28 | 75 | 139 | 148 | 54 | 738 KB | " | HIT / 23 |
| PDP | 3 | 32 | 133 | 182 | 160 | 54 | 738 KB | " | HIT / 29 |

Bytes by type (home): video 5,467 KB (3 files) · images 389 KB (22) · scripts 259 KB (16) · fonts 87 KB (2) · RSC prefetch fetches 72 KB (12 `?_rsc=` requests for every linked route) · CSS 15 KB · `/api/cart` 0.8 KB.
HTML response headers: `cache-control: public, max-age=0, must-revalidate`, `x-nextjs-prerender: 1`, `x-nextjs-stale-time: 300`, `x-vercel-cache: HIT` (age ≤60) or `STALE` (age >60, served instantly while regenerating). ISR is behaving; HTML is never the bottleneck.
The mount-time `GET /api/cart` started at 150–270 ms and took **1,854–2,550 ms** in all six runs — the last request to finish on every page load.

Script chunks (same on both pages): `12si0xbe8x_8w.js` 72 KB gz/224 KB (React DOM + Next runtime), `2smolq_k84s0h.js` 45/161 KB (app router),
`19mlfgw6nv0ur.js` 48/136 KB (**framer-motion**, loaded by Modal/Toast/MegaMenu in the root layout), `2dm33t_9fcoe3.js` 17/47 KB (app code: constants + next/image),
`19_iyyh69op3v.js` 15/47 KB, `3l8s4igfp4fjw.js` 11/34 KB, `1vcso2l8v1y68.js` 10/33 KB, `3mqrar9qprj6g.js` 9/29 KB, 8 more ≤7 KB each.
Deployed HTML: 12–13 external `<script>`, 62–66 total (50+ inline `self.__next_f.push` RSC chunks), 8 `<video>` on home (1 `preload=auto`, 7 `none`), 32 `<img>` (25 lazy), 0 `fetchpriority` attributes, no `preconnect`.

### 3. Basket latency in the browser (Playwright, PDP bruno-teddy…, click "Add to basket")

| Run | Cookie | Drawer visible after click | POST /api/cart/add | mount GET /api/cart | DELETE /api/cart/remove |
|---|---|---|---|---|---|
| cold-1 | none | **2,833 ms** | 2,504 ms | 2,180 ms | 2,318 ms |
| cold-2 | none | 2,319 | 2,265 | 2,086 | 2,112 |
| cold-3 | none | 2,322 | 2,146 | 2,254 | 2,032 |
| warm-1 | wd_cart_token | 2,822 | 2,423 | 1,925 | 2,166 |
| warm-2 | wd_cart_token | 2,816 | 2,344 | 2,247 | 2,250 |
| warm-3 | wd_cart_token | 2,316 | 2,196 | 2,135 | 2,323 |

Drawer delay − POST duration = 17–60 ms every time: the whole wait is the network call that `addToCart()` awaits before `setIsOpen(true)`.
Warm is not faster than cold: the proxy's bootstrap GET never fired because the mount-time GET had already set the cookie; the cost is per call, not per session.
Each function invocation landed on a different instance id (`x-vercel-id` suffixes 99k8g, dvlhg, kl6p2, rg5wr, tjz7m…), yet the three calls that reused `tjz7m` were just as slow (2.1–2.3 s), ruling out cold start.

### 4. curl timings from this Mac (TTFB; 3–4 samples)

| Request | TTFB | Notes |
|---|---|---|
| `GET wdlocks.co.uk/wp-json/wc/store/v1/cart` (no token) | 2.28 / 1.19 / 1.09 s, 1.96 s | first call creates a WC session (~+1 s) |
| same, with `Cart-Token` | **1.05 / 1.13 / 1.04 / 1.05 s** (back-to-back 1.41 / 1.15 / 1.14) | `cache-control: no-store`, `x-cdn-cache-status: MISS`, `x-cdn-node-is-at-origin: 1`, Apache/PHP 8.4 |
| `GET …/products?per_page=1` | 1.07 / 1.08 / 1.14 s | 4.7 KB; same ~1.05 s floor → WP boot cost |
| `GET …/products?per_page=20` (what ISR fetches) | 1.23 / 1.25 / 1.28 s | 78 KB |
| `GET wdlocks.co.uk/` and `/wp-json/` | 1.17–1.52 s / 1.33–1.44 s | whole origin is ~1.1–1.5 s per PHP request |
| `GET wdlocks-frontend.vercel.app/api/cart` (no cookie) | **2.45 / 2.27 / 2.06 s**, later 3.41 / 2.22 / 2.21 | `x-vercel-cache: MISS`, `cache-control: no-store, private` |
| same, with `wd_cart_token` cookie | **1.87 / 2.01 / 1.96 / 2.40 s** | ≈ upstream 1.05–1.13 s + **0.8–1.3 s** inside Vercel |
| `POST /api/cart/add` with `{}` (400/404 before upstream) | 63 / 57 / 86 / 53 / 56 ms | function + routing overhead baseline |
| `GET /` and `/products/3-star…` HTML | 41–60 ms / 42–58 ms | 328 KB / 247 KB uncompressed, HIT |
| `GET wdlocks.co.uk/wp-content/uploads/2024/12/watchdog1.png` | 31 / 31 / 32 ms | 658 KB PNG, `x-cdn-cache-status: HIT`, **no `cache-control`/`expires` header at all** |
| `GET /_next/image?url=…watchdog1.png&w=1536&q=75` | 45 / 34 / 33 ms | 22.5 KB AVIF, `cache-control: public, max-age=86400, must-revalidate`, STALE age 88,222 (re-optimised in background) |
| `GET /brand/video/hero-inside.mp4` (range 0-0) | HIT | `cache-control: public, max-age=0, must-revalidate` → browser revalidates 3.4 MB file each visit |

Split: **upstream WordPress ≈ 1.05–1.15 s** per Store API call (≈2.0–2.3 s when a session must be created) · **Vercel function ≈ 0.05–0.09 s** CPU/routing · **unexplained ≈ 0.8–1.3 s** between the lambda and wdlocks.co.uk (per-invocation DNS+TLS, AAAA `2a07:7800::155` present so Node may try IPv6 first, or the 20i CDN front treating datacenter IPs differently). The browser never sees the upstream directly, so the user pays all three.

## Root causes, ranked by user impact

1. **Every basket interaction is a synchronous ~2.1 s proxy round trip and the UI waits for it** (`src/hooks/useCart.tsx:155-176` `addToCart` awaits `addItem()` then `setIsOpen(true)`; `Modal` only mounts when `isOpen`). Add, update, remove and the mount GET each cost ~2.1 s; a shopper who adds two items and changes a quantity waits ~6 s of spinner. This is complaint (2) and (3).
2. **WooCommerce Store API responds in ~1.05 s minimum**, 2+ s for a new session; no page cache can help because responses are `no-store`. Server-side ISR hides this for product pages, but nothing hides it for the cart. Also the second-order effect: when the 60 s ISR window expires, the first visitor triggers two 1.2 s upstream fetches (layout + page) — served STALE so they do not wait, which is why TTFB stayed <60 ms.
3. **~1 s extra inside the Vercel → WordPress hop** (see §4). Doubles the cost of every cart call and is pure waste.
4. **Home page downloads 5.3 MB of video on first load** (`HeroBackdrop.tsx:82` `preload={i === 0 ? 'auto' : 'none'}` on a 3.4 MB file, `:55` `next.preload = 'auto'` immediately queues the 0.75 MB turntable, `ExplodedFilm.tsx:99` `preload="auto"` on 1.3 MB below the fold). On mobile throttling this is the difference between LCP 2.6 s and 4.0 s and the 810 ms TBT run; on real 4G it is complaint (1). Also the full 48 s carousel will pull inside-film.mp4 (6.8 MB) and key-turntable.mp4 (0.5 MB) = **~12 MB per home visit**.
5. **LCP image is not prioritised.** Home LCP is the blurred `<img>` poster in `HeroBackdrop.tsx:71` (plain `<img>`, no `fetchpriority`, 71 KB JPEG at full hero size, rendered with `blur-2xl`); PDP LCP (`ProductGallery.tsx:25-31`, `priority` set) is emitted as `<link rel=preload imagesrcset>` but without `fetchpriority="high"` (0 occurrences in HTML) and with `sizes="(max-width:1024px) 100vw, 50vw"` so a phone requests the 1536 w rendition. Lighthouse flags it on every run.
6. **Oversized HTML/RSC payload**: 328 KB home / 247 KB PDP (45 / 36 KB gz) because `RootLayout.tsx:16` and `page.tsx:27` both call `getProductsSSR()` and the full Store API objects (description HTML, all image sizes, `add_to_cart`, `extensions`…) are serialised into the client payload twice, then again into `CartDrawer`/`Navbar` props. ~230 KB has to be parsed before hydration completes, part of the 1,040 ms LCP render delay on mobile.
7. **framer-motion (48 KB gz, 91 % unused at load) is in the root layout bundle** via `Modal.tsx`, `Toast.tsx`, `MegaMenu.tsx`; it is not what delays the drawer (≤60 ms), but it is the single largest avoidable JS cost on every page.
8. Minor: 12 `?_rsc=` prefetches (72 KB) on every page load from `<Link>`s in Navbar/Footer/MegaMenu; render-blocking 15 KB CSS; poster JPEGs served unoptimised (`<img src>` / `poster=`), `/brand/video/*.mp4` and posters have `max-age=0`; no `preconnect` to wdlocks.co.uk for the image optimiser's origin (server-side so irrelevant) — fine; `Set-Cookie: _fbp` from the Store API means the WP Facebook-pixel plugin runs on every REST call (part of the 1 s floor).

## Recommended fixes, ranked by impact / effort

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1 | **Open the drawer optimistically.** `useCart.tsx addToCart`: set `isOpen=true` and push an optimistic line (build a `WooCartItem` from the `WooProduct` the caller already has: name, prices, image, quantity, `key: 'optimistic-'+id`) *before* `await addItem()`; on success replace with server cart, on failure roll back + toast (same pattern already used for update/remove). Pass `product` (or `name/price/image`) in `AddToCartInput` from `AddToCart.tsx`, `ProductCard.tsx`, `VariationSelector.tsx`, `KeysConfigurator.tsx`. Show `pendingKeys` spinner on the optimistic row, keep "Go to checkout" disabled while `pendingKeys.size > 0` (already the case). Drawer delay 2.3–2.8 s → **<100 ms**. | Very high | Low (½ day) |
| 2 | **Measure and remove the ~1 s Vercel→WP hop.** In `cart-proxy.ts proxyCartRequest` wrap the `fetch` in `performance.now()` and emit `Server-Timing: upstream;dur=…, total;dur=…` on `toProxyResponse`; log `cartToken` presence. Then try, in order: (a) `fetch` with `keepalive`/an `undici.Agent({ connect: { family: 4 } })` or set `NODE_OPTIONS=--dns-result-order=ipv4first` / `--no-network-family-autoselection` on the Vercel project to skip the IPv6 attempt; (b) enable Vercel Fluid compute so the warm instance reuses its TLS connection to wdlocks.co.uk; (c) ask the host (20i-style CDN headers) whether datacenter IPs are being challenged. Expected: `/api/cart` 2.1 s → ~1.2 s for every call. | Very high | Low–medium |
| 3 | **Stop waiting on WordPress for reads.** (a) `GET /api/cart` on mount: render the drawer badge from a tiny signed cookie (`wd_cart_count`, written by `toProxyResponse` from `body.items_count`) and only fetch the full cart when the drawer/basket page opens (`useCart.tsx:117` effect → lazy `load()` on first `openCart`/basket mount). (b) Collapse mutations: `/api/cart/add` already returns the full cart, so never follow it with a GET (confirm no double call in `KeysConfigurator`). (c) Return the cart from the proxy before re-serialising: `res.json()`→`NextResponse.json` is fine, but drop the `Array.isArray` refetch path for `remove` by calling `/cart/remove-item` (already done) — keep. Saves one 2 s request per page view and removes the "spinner badge" on first paint. | High | Low |
| 4 | **Fix WordPress response time (owner/host task, biggest absolute win).** ~1.05 s for a 4.7 KB `/products?per_page=1` is PHP boot: enable a persistent object cache (Redis/Memcached via the host), PHP OPcache + JIT, disable the Facebook-for-WooCommerce pixel on REST requests (`_fbp` cookie is set on every Store API call), and audit plugins with Query Monitor on a `/wp-json/wc/store/v1/cart` request. Target <400 ms. Also set `Cache-Control: public, max-age=31536000, immutable` on `/wp-content/uploads` (currently none). Every cart call and every ISR regeneration benefits. | Very high | Medium (ops) |
| 5 | **Cut first-load video from 5.3 MB to 0.** `HeroBackdrop.tsx`: `preload="none"` on all four `<video>` (also index 0), start the first film from the IntersectionObserver effect after `load`/`requestIdleCallback` and only when `navigator.connection?.saveData !== true` and `(min-width: 768px)` (phones get the poster only — the poster is already the LCP); set `next.preload='auto'` only ~3 s before the crossfade, not at slot start; re-encode hero-inside.mp4 (3.4 MB/15 s = 1.8 Mbps) to ≤1 MB (720p, CRF 28) and the 6.8 MB inside-film.mp4 to ≤2 MB or drop it from the carousel. `ExplodedFilm.tsx:99` `preload="auto"` → `"none"` and flip to `auto` in its IntersectionObserver (as `useInViewPlayback` already does). Mobile LCP 4.0→~1.8 s, TBT ↓, data ↓ 5 MB. | High (mobile) | Low |
| 6 | **Prioritise the LCP image.** Home: replace the two blurred `<img>` fills in `HeroBackdrop.tsx:71` with `next/image` (`priority`, `fetchPriority="high"`, `sizes="100vw"`, quality 40 — it is blurred anyway; or a 20 KB pre-blurred 640 px asset), and render only the active film's fill (currently all `contain` posters are preloaded: hero-inside + inside-film). PDP `ProductGallery.tsx:31`: `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 40vw"` and `fetchPriority="high"` on the first image (Next 16 passes it through to the preload). | Medium | Low |
| 7 | **Shrink the RSC payload.** Fetch products once per request (`React.cache()` around `getProductsSSR` or move the page's call to use the layout's data via a shared cached function) and map to a lean `ProductSummary {id, slug, name, prices.price, images[0].{src,thumbnail,alt}, is_in_stock, type}` before passing to `Navbar`, `CartDrawer`, `ProductGrid`; keep full objects only in the PDP. Expect HTML 328→~120 KB raw, hydration data ↓ ~150 KB. | Medium | Medium |
| 8 | **Drop framer-motion from the critical path.** `Modal.tsx`, `Toast.tsx`, `MegaMenu.tsx`: either CSS transitions (`@starting-style`/`transition` on `transform`/`opacity`, 0 KB) or `import { LazyMotion, domAnimation, m } from 'framer-motion'` with `features={() => import(...)}` so the 48 KB chunk loads after interaction. −48 KB gz / −136 KB parse on every page. | Medium | Low–medium |
| 9 | Small wins: `prefetch={false}` on Footer/MegaMenu `<Link>`s (−12 requests, −72 KB per page); serve `/brand/video/*-poster.jpg` through `next/image` or pre-size them (explainer-inline-poster 89 KB → ~20 KB); `headers()` in `next.config.ts`: `/brand/video/:path*` → `public, max-age=31536000, immutable` (files are content-stable; rename on change); add `Cache-Control: private, no-store` + `Server-Timing` is already there for `/api/*`. | Low | Low |

Not recommended: caching `GET /api/cart` at the edge (it is per-session), or calling the Store API from the browser (CORS and third-party-cookie blocks — the proxy is necessary; just make it cheap and asynchronous).

## Verification plan

1. **Before/after basket script**: rerun `basket-latency.js` (3 cold + 3 warm) after fix 1; pass criterion drawer visible <150 ms p95, POST still ≤ current. After fix 2/4, `curl -w` GET `/api/cart` ×10 with cookie; target p50 <1.3 s (fix 2) then <0.6 s (fix 4). Check the new `Server-Timing` header shows `upstream` ≈ direct curl to wdlocks.co.uk.
2. **Field data**: add `@vercel/speed-insights` (or web-vitals → `/api/vitals`) to get real-user LCP/INP per route; the owner's "very slow" is almost certainly mobile 4G, which lab desktop numbers (LCP 0.3 s) hide. Watch INP on the add-to-basket click (should drop from ~2.3 s "busy" to <200 ms with fix 1).
3. **Lighthouse CI**: `npx lighthouse --preset=mobile` ×3 on `/` and the PDP after fixes 5–6; targets: home mobile LCP <2.5 s on all runs, total bytes <1.5 MB, score ≥90; PDP mobile LCP <2.5 s, "fetchpriority" check passing. Reports are reproducible with `lighthouse-run.sh` in the scratchpad folder.
4. **Payload regression check**: `curl -s --compressed / | wc -c` (<150 KB raw) and count of `short_description` in HTML (should be 9 on home, 1 on PDP) after fix 7; `nav-timing.js` sums script bytes (expect ≤210 KB gz after fix 8).
5. **Functional**: Playwright e2e — add, change quantity, remove, undo, cookie-blocked first click (bootstrap path in `cart-proxy.ts:99`) still succeeds; optimistic row must roll back on a forced 502 (point `NEXT_PUBLIC_WC_BASE` at a dead host in preview).
6. **Upstream monitoring**: a cron/uptime check hitting `GET /wp-json/wc/store/v1/products?per_page=1` every 5 min with a 700 ms alert threshold, so WordPress regressions (plugin updates, cache eviction) are caught before shoppers feel them.
