# Can WP Engine's Headless Platform host the new front end?

Researched 13 Nov 2026 from WP Engine's own documentation and the npm registry. Background: Tomia hosts wdlocks.co.uk on WP Engine's standard (PHP/WordPress) platform, which cannot run Next.js. Vercel is ruled out by Pritam. The question is whether WP Engine's separate Headless Platform (formerly Atlas) can run this app.

## Short answer

Probably yes for the basics, but **not proven, and not officially supported for the way this app is built.** WP Engine documents Next.js support around the older Pages Router. It says the App Router, which this app uses throughout, is only partly supported, and it never names Next.js 16. Several things that matter (limits, regions, price, whether pages refresh correctly) are not documented anywhere. Only a test deploy and a sales quote can settle them.

## What our app needs vs what WP Engine documents

| Our app uses | WP Engine says | Verdict |
|---|---|---|
| Next.js **16.4** | Version tables stop at "Next.js ≥15.2.1". Next 16 is not mentioned. `@wpengine/atlas-next` 3.0.3 (Dec 2025) accepts `next >=15.2.1` | **Unknown**: not excluded, not confirmed |
| **App Router** for every page | "Our Headless Platform does not currently support its full range of functionality and features" (Next.js guide; walkthrough is Pages Router only). Which features are missing is not listed | **Risk**: officially partial |
| **Pages that refresh on a timer** (`revalidate = 60` on home, products, product pages; 3600 elsewhere). No on-demand refresh (`revalidatePath`/`revalidateTag` not used) | WP Engine's ISR support (shared cache via `@wpengine/atlas-next`) is "only in the context of the traditional Pages Router"; App Router on-demand refresh is not supported. Timer-based refresh on the App Router is not documented either way | **Unknown**: likely falls back to Next's own cache on each server, but depends on a writable disk, which is undocumented |
| **8 server routes** (Stripe intent/status/webhook, contact, guarantee, trade, crime, demo checkout), all dynamic | Apps run on "the origin Node server"; no serverless/edge functions. Route handlers not mentioned | **Probably fine**: they are normal Node requests |
| `next/image` (31 files) | Image domains must be declared in config (ours are). Optimisation itself not covered | **Probably fine**: runs on the Node server |
| Redirects in `next.config.ts` (old /shop, /product URLs) | "Redirects are supported." Rewrites are not supported for ISR | **Fine**: we use redirects only, no rewrites |
| No middleware/proxy, no draft mode, no websockets | Middleware runs at origin only; draft mode and websockets not supported | **Fine**: we use none of these |
| `npm run build` / `npm run start`, port 3000 | Defaults are `npm run build` and `npm run start`; app must listen on 8080 or 3000 | **Fine** |
| Node 20.9+ (Next 16 minimum) | Supports Node 22, 24, 26; defaults to Active LTS (24) when `package.json` has no `engines` | **Fine** |
| Environment variables (Stripe keys, WC base URL, site URL) | Set per environment in the portal; changes apply only to the next build. `PORT` and `WPE_*` reserved | **Fine**, but every change needs a rebuild |
| Deploy on push to `main` | Git-based (GitHub, Bitbucket, GitLab); pushes redeploy automatically; rollback to earlier builds | **Fine** |

## What the documentation does not say

These are not covered on any page I found, so they cannot be confirmed without a test or a sales conversation:

- **Price.** Not published; sold by quote. Older Atlas plans were listed by third parties at about $41 to $416 per month, but those figures are dated and not official.
- **Regions.** You pick a region when creating the app and cannot change it later, but the list (UK/EU or not) is not published.
- **Limits.** No published figures for build time, memory, request timeouts, bandwidth, number of server instances, or whether the disk is writable.
- **How the CDN caches pages.** Default caching for static files is about 10 seconds; HTML and API caching, and whether Next's `s-maxage` headers are honoured, are not described. The CDN is purged after each deploy.
- **WordPress plugins.** The setup wizard asks to install WPGraphQL, Faust.js and the WP Engine Atlas Headless Extension on the linked WordPress site. Our app does not need them (it uses the WooCommerce Store API). Whether that step can be skipped is not stated. Installing them would be a change to wdlocks.co.uk.

## Account and support conditions

- Needs a WP Engine account **with a Headless plan**. "It is not possible to try the platform out using your existing, non-headless accounts."
- "WP Engine Headless Platform is not available for AWS plans." Tomia needs to confirm which kind of plan wdlocks.co.uk is on.
- The app must be linked to a WordPress environment in the same account, so Tomia (the account owner) has to set it up or add us as portal users.
- WP Engine support covers the portal, deploy errors and caching/CDN issues, but "does not cover custom code troubleshooting." Free trial (sandbox) accounts get no support technicians.

## What would settle it

1. **Ask Tomia:** is the wdlocks account an AWS plan? Can a Headless plan be added, at what price, and in which region?
2. **Ask WP Engine (via Tomia):** is Next.js 16 with the App Router supported? Is timer-based refresh (`export const revalidate`) supported on the App Router? Is the server disk writable, and how many instances run?
3. **Test deploy:** on a free trial or Tomia's account, deploy this repo unchanged and check: build succeeds; every page loads; a price change in WooCommerce appears within about a minute; the contact, trade, guarantee and crime routes work; Stripe test checkout and its webhook work; product images load.

If any of those fail, the fallback is a general Node host on an account the client owns, with WordPress staying on WP Engine.

## Sources

- [Headless Platform overview](https://developers.wpengine.com/docs/atlas/overview)
- [Next.js framework guide](https://developers.wpengine.com/docs/headless-platform/framework-guides/next-js/next)
- [Next.js ISR support](https://developers.wpengine.com/docs/headless-platform/framework-guides/next-js/nextjs-isr-support)
- [Customizing builds (Node versions, build/start commands)](https://developers.wpengine.com/docs/headless-platform/platform-guides/customizing-builds)
- [Environment variables](https://developers.wpengine.com/docs/headless-platform/platform-guides/environment-variables)
- [Deploy from an existing repo (ports, region, plugins step)](https://developers.wpengine.com/docs/headless-platform/getting-started/deploy-from-existing-repo)
- [Cache-Control headers](https://developers.wpengine.com/docs/headless-platform/additional-guides/cache-control)
- [Networking (websockets)](https://developers.wpengine.com/docs/headless-platform/additional-guides/networking)
- [Troubleshooting builds](https://developers.wpengine.com/docs/headless-platform/platform-guides/troubleshooting-builds)
- [Headless Platform support page (plans, AWS restriction)](https://wpengine.com/support/headless/)
- [Headless scope of support](https://wpengine.com/support/headless-scope-of-support/)
- [`@wpengine/atlas-next` on npm](https://registry.npmjs.org/@wpengine/atlas-next)
- Pricing (third-party, dated): [instawp.com](https://instawp.com/best-headless-wordpress-hosting-options-for-agencies/), [wpism.com](https://wpism.com/atlas-wp-engine-headless-wordpress/)

## Alternative: static export on standard WP Engine (no Node.js)

Added 14 Nov 2026. Next.js can build to plain HTML/JS/CSS files (`output: 'export'`), which any web server can serve, including WP Engine's standard platform ([WP Engine: static HTML site](https://wpengine.com/support/static-html-website/): a separate site in the User Portal, deployed by SFTP, SSH or Git, cache cleared by hand after each update, no support for static-site issues).

What a static export cannot do ([Next.js: static exports](https://nextjs.org/docs/app/guides/static-exports)), mapped to this app:

| Unsupported in static export | Where this app uses it | Consequence |
|---|---|---|
| Route handlers that read the request | All 8 `/api/*` routes | Stripe checkout, webhook, contact, trade, guarantee and crime routes disappear; each needs a browser-side or WordPress-side replacement |
| ISR (`revalidate`) | Home, products, product pages (60 s), others (3600 s) | Prices and stock are frozen at build time; every change needs a rebuild, upload and cache clear |
| `dynamicParams: true` | Product and blog pages | New products/posts get no page until the next rebuild |
| Redirects and headers in `next.config` | Old /shop, /product redirects; CSP and security headers | Must be recreated as WP Engine Web Rules / redirect rules |
| Default image optimisation | `next/image` in 31 files | Images served unoptimised unless a custom loader/CDN is added |

The deeper problem is the browser and the shop being on different addresses. With WordPress on shop.wdlocks.co.uk and the static site on wdlocks.co.uk, the browser cannot call the Store API or the form endpoints (wdlocks.co.uk sends no CORS headers for other origins), so a multi-item basket cannot be handed to WooCommerce's checkout without a WordPress-side change, which the no-changes rule rules out. Serving the static files from inside the same WordPress install (same address) would avoid that, but WP Engine documents static sites only as separate sites, and whether its nginx would let static files and WordPress share the root is unconfirmed.
