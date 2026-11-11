# Media hosting research: where should the images and videos live?

Date: 11 Nov 2026. Question from the owner: "where should the images be stored to receive them quickly without making the website heavy?"
Scope: ~9 WooCommerce products (~40 product images on `wdlocks.co.uk/wp-content/uploads`), 9 brand renders in
`public/brand/product` (5.4 MB), 11 mp4 clips + 11 posters in `public/brand/video` (23 MB), a 7.3 MB brochure PDF; `public/brand` totals 35 MB.
Hosting: Next.js 16 on Vercel (`lhr1`), `next/image` with `formats: ['image/avif','image/webp']`, `minimumCacheTTL: 86400`, remote images allowed only from `wdlocks.co.uk/wp-content/uploads/**`.

## 1. Measurements (from a UK connection, 11 Nov 2026, `curl -w '%{time_starttransfer} %{time_total} %{size_download}'`)

### (a) Product images straight from WordPress (`wdlocks.co.uk/wp-content/uploads`)

| Image | TTFB (3 runs) | Total | Bytes |
| --- | --- | --- | --- |
| `2026/09/ChatGPT-Image-Sep-24…PM.png` (Watchdog 1 Star extra keys) | 35 / 28 / 30 ms | 77–94 ms | 783,625 (PNG) |
| `2026/02/Doll-wdlock-final-scaled.webp` (Bruno Teddy) | 32 / 28 / 30 ms | 60–65 ms | 241,758 (WebP) |

Headers: `server: Apache`, `x-provided-by: StackCDN`, `x-via: LHR2/LHR5`, `x-cdn-cache-status: MISS`, `x-cdn-node-is-at-origin: 1`, `accept-ranges: bytes`, **no `Cache-Control`**.
The 20i shared host already sits behind StackCDN with London nodes, so TTFB is fine (~30 ms). The problem is weight, not latency: the originals are 240–780 KB and WooCommerce serves them full-size with no cache header.

### (b) The same images through the live optimiser (`/_next/image?url=…&w=…&q=75`, `Accept: image/avif`)

| Request | Run 1 | Run 2 | Run 3 | Output |
| --- | --- | --- | --- | --- |
| PNG, `w=640` (already warm, `age: 39`) | 50 ms HIT | 37 ms HIT | 37 ms HIT | 10,963 B AVIF |
| PNG, `w=1536` (cold) | **422 ms MISS** | 302 ms HIT (propagating) | 46 ms HIT | 36,783 B AVIF |
| WebP, `w=640` (warm) | 32 ms HIT | 32 ms HIT | 50 ms HIT | 11,522 B AVIF |
| WebP, `w=1536` (warm, `age: 19805`) | 39 ms HIT | 56 ms HIT | 36 ms HIT | 47,229 B AVIF |
| Local `/brand/product/cylinder-hero.png` (2,180,449 B raw), `w=1280` | 41 ms HIT | | | 44,139 B AVIF |

Response header: `cache-control: public, max-age=86400, must-revalidate`, `x-vercel-cache: MISS|HIT`.
Takeaways: AVIF output is **20–70x smaller** than the WordPress originals (784 KB → 11 KB at 640 px). A cold transformation costs ~0.4 s once per variant per region, then ~40 ms. With `minimumCacheTTL` = 1 day and no upstream `Cache-Control`, every variant goes STALE daily and is re-transformed (billed as a transformation).

### (c) Brand mp4s from Vercel `/public` (`https://wdlocks-frontend.vercel.app/brand/video/…`)

| File | TTFB (3 runs) | Total | Bytes | Cache |
| --- | --- | --- | --- | --- |
| `hero-inside.mp4` (15 s, 960x768 H.264, 1.8 Mbit/s) | 34 / 35 / 43 ms | 88–200 ms | 3,404,519 | HIT, `age: 257` |
| `inside-film.mp4` (38 s, 1024x820 H.264, 1.4 Mbit/s) | 36 / 36 / 36 ms | ~130 ms | 6,772,097 | HIT, `age: 792` |
| `clip-pins.mp4` (9 s, 960x540, 0.65 Mbit/s) | **309 ms MISS** / 42 / 38 ms | 341 → 65 ms | 734,978 | MISS then HIT |

Headers: `accept-ranges: bytes`, `cache-control: public, max-age=0, must-revalidate`, `etag`, `content-type: video/mp4`.
Range requests are honoured from the edge cache: `bytes=0-1023` → `206`, `content-range: bytes 0-1023/3404519`, 43 ms; a mid-file range (`2000000-2001023`) → `206` in 34 ms, both `x-vercel-cache: HIT`. So scrubbing/seeking and Safari's byte-range probing work.
Note the browser-side `max-age=0, must-revalidate`: Vercel caches `/public` files at the edge for the life of the deployment, but every repeat visit revalidates each poster and mp4 with a conditional request (304). Cheap, but it is one round-trip per asset that a long `max-age` on `/brand/video/*` would remove.

Home page weight today (cold): HTML 328 KB + hero film 1 (`preload="auto"`, 3.4 MB) + exploded clip (`preload="auto"`, 1.3 MB) ≈ **5 MB** before any image, rising to ~14.6 MB if the visitor steps through all four hero films. Films 2–4 are `preload="none"` and the video bar shows posters only, which is right.

## 2. Options for images (~50 source images, ~50k page views/month)

| Option | How images get there | Formats / responsive | UK edge | Cost at our scale | Next build / ISR | Ops burden | Lock-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Current: WordPress origin + `next/image` on Vercel**, brand files in `/public` | Nothing to do; WooCommerce `images[].src` is passed to `next/image`; brand files committed to the repo | AVIF + WebP, `srcset` from `deviceSizes`/`imageSizes`, quality allow-list | Yes (`lhr1` cache; StackCDN LHR for origin pulls) | Hobby: 5K transformations/mo included (then images fail with 402 and show `alt`); Pro: $0.0622/1K transformations, $0.48/1M cache reads, $4.80/1M writes (lhr1). ~60 sources x ~5 variants = ~300 variants; worst case re-transformed daily ≈ 9K/mo ≈ **$0.56/mo**. Delivery ≈ 50k views x ~300 KB ≈ 15 GB ≈ within Pro Flat Rate CDN (1 TB) | None; images are fetched at request time, not at build | Lowest. Client uploads in WooCommerce as now | Low (standard `next/image`; `loaderFile` swaps the CDN later) |
| **Vercel Blob** | Upload via `@vercel/blob` (script or admin UI); or sync job that copies WooCommerce uploads | No transforms itself; still goes through `next/image` (add `*.public.blob.vercel-storage.com` to `remotePatterns`) | Yes (Vercel CDN) | Storage $0.024/GB, Blob transfer $0.05/GB (Hobby: 1 GB + 10 GB free). Pennies; **plus** the same Image Optimization charges | None | Medium: a sync step between WooCommerce and Blob, or the client uploads twice | Medium (Vercel SDK/URLs) |
| **Cloudinary** | Auto-upload "fetch" from `wdlocks.co.uk`, or WordPress plugin that mirrors the media library | `f_auto,q_auto` (AVIF/WebP), `w_` resize, DPR, art-direction; video too | Yes (Akamai/Fastly multi-CDN) | Free: 25 credits (1 credit = 1K transformations, 1 GB storage or 1 GB bandwidth); 50 images x 5 variants + ~15 GB/mo fits free. Plus is $99/mo if outgrown | None (`loaderFile` points `next/image` at Cloudinary, Vercel transformations drop to 0) | Low–medium (plugin keeps WP in sync) | High (URL grammar, plugin) |
| **imgix** | Point a Source at `wdlocks.co.uk/wp-content/uploads` (web folder source) | `auto=format,compress`, `w=`, `dpr`; excellent | Yes (Fastly) | **No free tier**: Basic $75/mo (375 credits). Overkill here | None (`loaderFile`) | Low | Medium |
| **Cloudflare Images + R2** | Put `wdlocks.co.uk` DNS on Cloudflare and enable Transformations (`/cdn-cgi/image/…` in front of WP uploads), or upload to Images/R2 | `format=auto` (AVIF/WebP), width, quality, fit | Yes (LHR/MAN PoPs) | Free plan: 5,000 unique transformations/mo; paid: $0.50/1K after 5K; Images storage $5/100k, delivery $1/100k. R2: 10 GB free, egress free. ~free for us | None (`loaderFile`) | Medium: the client's DNS moves to Cloudflare (also gives WAF/cache for WooCommerce) | Medium |
| **Bunny CDN + Optimizer** | Pull zone with origin `wdlocks.co.uk`; Optimizer rewrites `?width=…` | WebP (AVIF via Optimizer), dynamic resize/quality | Yes (London PoP) | $0.01/GB Europe ($1/mo minimum) + Optimizer $9.50/site/mo → **~$11/mo** | None (`loaderFile`) | Low | Low–medium |
| **Keep in WordPress + Cloudflare free/Jetpack Photon** | Nothing; `i0.wp.com/wdlocks.co.uk/...?w=640` or Cloudflare caching of uploads | Photon: WebP only, no AVIF, cannot purge (rename file to refresh). Cloudflare free: caching only, no resize | Yes | Free | None | Low | Low, but Photon is Jetpack-only and WordPress.com terms |

Conclusion for images: the current path already produces the smallest bytes (AVIF, right-sized) from the nearest edge, and the WordPress origin is only touched once per variant per day. Moving the source files would not make them arrive faster; it would add a sync problem. The two cheap wins are (1) raise `minimumCacheTTL` to 31 days so variants stop being re-encoded daily, and (2) keep `qualities: [75]` (Next 16 requires the allow-list) so one quality cannot multiply the variant count.

## 3. Video

### Where to host

| Option | Delivery | Cost at ~10 GB/mo (and at the realistic ~100 GB/mo, see below) | Fit for short muted loops |
| --- | --- | --- | --- |
| **Self-hosted mp4 in `/public` on Vercel (current)** | Progressive mp4, Range OK, edge cached, 35–45 ms TTFB from UK | Hobby: inside 100 GB/mo but Hobby is **non-commercial only**, so this shop must be on Pro anyway. Pro: Fast Data Transfer is $0.15/GB on-demand (lhr1) but Flat Rate CDN (included) covers 1 TB/mo, so $0 extra until video is "the majority of bandwidth" (out of scope of Flat Rate) | Best. Zero latency to start, no player JS, blends with CSS (`mix-blend-multiply`) |
| **Vercel Blob** | Progressive mp4 from Blob CDN, Range OK | $0.05/GB Blob transfer; ~$0.50–5/mo; files out of the repo (deploy size, Hobby 100 MB source limit) | Good; same `<video src>`; optional |
| **Mux** | HLS (adaptive) + optional static mp4 renditions, Mux Player | Encoding free (1080p basic), storage $0.003/min/mo, delivery $0.001/min after 100,000 free min/mo. 15 s hero x 20k plays = 5,000 min → **free**; Launch plan $20/mo if you want support | Over-engineered for 2–15 s loops; HLS adds player JS and a manifest round-trip before first frame |
| **Cloudflare Stream** | HLS/DASH on `customer-<code>.cloudflarestream.com`, mp4 download URL | $5 per 1,000 min stored (prepaid) + $1 per 1,000 min delivered; ≈ **$10/mo** | Same caveat as Mux; mp4 download needs enabling per video |
| **Bunny Stream** | HLS + optional mp4 fallback (must be enabled before upload), free player | Encoding free, storage $0.01/GB, delivery from $0.005/GB, $1 minimum → **~$1–2/mo** | Cheapest adaptive option; UK PoP |

Reality check on volume: at 50k views/month, if 20k land on the home page, each cold home view downloads 3.4 MB (hero film 1) + 1.3 MB (exploded clip) ≈ 4.7 MB → **~94 GB/mo**, not 10 GB. Stepping through the carousel adds up to 11 MB more per visitor. The "10 GB" figure would only hold if most visitors are repeat (304) or mobile-saver.

### Adaptive (HLS) vs progressive mp4

For muted, autoplaying, looping background clips of 2–15 s, progressive mp4 wins: no manifest fetch, no segment ladder, no JS player, native `<video>` blending and `currentTime` scrubbing (the exploded clip is scrubbed by scroll and is all-intra for that reason; HLS would break it). Adaptive streaming earns its place only for the 33–40 s films with sound (`watchdog-film`, `inside-film`, `explainer-inline`, 3–7 MB each) and only once traffic or international audiences grow.

### Recommended encodes and markup

- Codec ladder: H.264 High profile (`-profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart`) as the universal `<source>`; add an AV1 (`libsvtav1`, `crf 35`) or HEVC source first for ~40–50% savings on Chrome/Safari. Use `<source type="video/mp4; codecs=av01…">` ordering so the browser picks the cheapest it can play.
- Resolutions: two renditions per clip, 960x? for mobile (≤ 1.2 Mbit/s) and 1280/1440 for desktop (≤ 2.5 Mbit/s), chosen with `<source media="(min-width: 1024px)">`. The 2 s exploded clip at 5.2 Mbit/s is fine (all-intra by design).
- Target bitrate for the 15 s hero loop: 1.2–1.5 Mbit/s → ~2.5 MB; today it is 1.8 Mbit/s / 3.4 MB. Trim film 1 to 10 s to shave another 1 MB.
- Posters: keep (`poster=` + `next/image` AVIF poster, 20–90 KB). The hero's first poster should be `<link rel="preload" as="image" fetchpriority="high">` because it is the LCP candidate.
- `preload`: `auto` only for the first hero film and only when in view; `none` for films 2–4 and for the exploded clip until its section is within one viewport (IntersectionObserver swap, as `web.dev/articles/lazy-loading-video` describes); `metadata` for the click-to-play films. Honour `prefers-reduced-motion` and `navigator.connection.saveData` by not attaching `<source>`.
- Range support: already honoured by Vercel; keep `+faststart` so the `moov` atom is at the front and Safari's first byte-range probe succeeds.
- Headers: add `Cache-Control: public, max-age=31536000, immutable` for `/brand/video/:path*` and `/brand/product/:path*` in `next.config.ts headers()`, and version filenames when content changes (`hero-inside-v2.mp4`). That turns repeat visits into zero requests for 23 MB of media.

## 4. Recommendation for WD Locks

**Now (before launch):** keep both the product images and the brand media exactly where they are. The measurements show the architecture is already right: WooCommerce stays the single place the client uploads product photos; Vercel turns them into 10–50 KB AVIF at the London edge in ~40 ms; the brand films are served from the same edge with Range support. Spend the effort on weight, not on relocation:

1. Move the project to **Vercel Pro** (the shop is commercial; Hobby forbids it, and Pro's Flat Rate CDN covers 1 TB/mo and removes the 5K-transformation cliff that would make product images fail with 402).
2. `next.config.ts`: `minimumCacheTTL: 2678400` (31 days), `qualities: [75]`, add the immutable header rule for `/brand/(video|product)/:path*`.
3. Re-encode the 11 clips (two renditions, ~1.3 Mbit/s mobile), trim hero film 1 to ~10 s, add AV1 sources; lazy-attach everything below the fold. Target: home page cold weight ≤ 3 MB including one hero film.
4. Ask the client to upload product photos as 1600 px JPEG/WebP ≤ 300 KB (WooCommerce "large" size), not 780 KB PNG renders; the optimiser hides this from visitors but it is the one origin fetch per variant per month.
5. Move the 7.3 MB brochure PDF out of `/public` into Vercel Blob (or the WordPress media library) so it stops inflating deploys; link to it, do not bundle it.

**When it scales** (international traffic, video > ~300 GB/mo, or more than ~500 SKUs):
- Images: keep WooCommerce as the source of truth and switch the transformer with one `loaderFile` (Cloudflare Images transformations if the client's DNS moves to Cloudflare, otherwise Cloudinary free tier). No image migration is ever needed because `next/image` only needs a URL.
- Video: move the long films with sound to **Bunny Stream** (cheapest, UK PoP, mp4 fallback) or Mux (best player/analytics, generous free minutes); keep the short loops as progressive mp4 on Vercel Blob or Bunny CDN.

### Migration checklist (if/when a CDN is adopted)

- Env: `NEXT_PUBLIC_MEDIA_HOST` (CDN hostname), `NEXT_PUBLIC_WC_BASE` already exists; Blob needs `BLOB_READ_WRITE_TOKEN` (server only); Bunny needs `BUNNY_STORAGE_ZONE` + API key for the sync script.
- `next.config.ts`: `images.loader: 'custom'`, `images.loaderFile: './src/lib/image-loader.ts'` (maps `{src,width,quality}` → CDN URL, passes WooCommerce URLs through as fetch/pull origin); add the CDN host to `remotePatterns`, `img-src`, `media-src` and `connect-src` in the CSP; keep `search: ''` on `remotePatterns` so arbitrary query strings cannot mint new variants.
- Product image sync (only if files physically move): a nightly route or GitHub Action that reads `/wp-json/wc/store/v1/products?per_page=100`, uploads each `images[].src` to Blob/R2/Bunny keyed by WooCommerce attachment id + `modified` timestamp, and stores the mapping in `src/lib/media-map.json`; the card components look up the CDN URL and fall back to the WooCommerce URL. With a pull-zone CDN (Cloudflare, Bunny, Cloudinary fetch) none of this is required.
- Caching headers: origin images should send `Cache-Control: public, max-age=2592000` (add to the WordPress mu-plugin or `.htaccess` for `/wp-content/uploads/*`); CDN variants `max-age=31536000, immutable`; brand media in `/public` as above; HTML stays `max-age=0, must-revalidate` (ISR).
- Test plan: `curl -I` for `x-vercel-cache`/`cf-cache-status`, Lighthouse mobile on `/` and `/products/[slug]`, verify `206` on a Range request, confirm AVIF `content-type` and that no `/_next/image` call returns 402.

### What to tell the client

"Your product photos stay in WooCommerce, which is the right place for you to manage them. The new site does not send visitors those files; it sends a 10–50 KB AVIF copy from a server in London, made once and cached, so pages load fast without you doing anything. The films are the heavy part: we will re-encode them to roughly half their size and only load the one on screen. Hosting cost for all media at today's traffic is a few pounds a month inside the Vercel Pro plan; if the videos become very popular we can move them to a video CDN for about £1–10 a month without redesigning anything."

## Sources

- Vercel: [Image Optimization limits and pricing](https://vercel.com/docs/image-optimization/limits-and-pricing), [lhr1 regional pricing](https://vercel.com/docs/pricing/regional-pricing/lhr1), [CDN pricing and usage](https://vercel.com/docs/manage-cdn-usage), [Flat Rate CDN](https://vercel.com/docs/pricing/flat-rate-cdn), [CDN cache](https://vercel.com/docs/caching/cdn-cache), [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing), [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), [Limits](https://vercel.com/docs/limits), [Hosting videos guide](https://vercel.com/kb/guide/best-practices-for-hosting-videos-on-vercel-nextjs-mp4-gif)
- Next.js: [`next/image` reference](https://nextjs.org/docs/app/api-reference/components/image) (`loaderFile`, `minimumCacheTTL`, `qualities`, `remotePatterns.search`)
- [Cloudinary pricing](https://cloudinary.com/pricing), [imgix pricing](https://imgix.com/pricing), [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/), [Cloudflare transformations](https://developers.cloudflare.com/images/transform-images/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/), [Stream manifests](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/)
- [Bunny CDN pricing](https://bunny.net/pricing/), [Bunny Optimizer](https://bunny.net/pricing/optimizer/), [Bunny Stream](https://bunny.net/pricing/stream/), [Bunny encoding docs](https://bunny.net/docs/stream/encoding)
- [Mux pricing](https://www.mux.com/pricing), [Mux autoplay guide](https://www.mux.com/docs/guides/web-autoplay-your-videos)
- [Jetpack Site Accelerator](https://jetpack.com/support/site-accelerator/), [web.dev: lazy-loading video](https://web.dev/articles/lazy-loading-video)
