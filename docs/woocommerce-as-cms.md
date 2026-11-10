# WooCommerce / WordPress as the CMS for the Next.js storefront

Research note, 10 Nov 2026. Facts below were checked read-only against wdlocks.co.uk; everything else is the
recommended approach.

## What the WordPress site exposes today

| Thing | Found | What it means for headless |
|---|---|---|
| WordPress 7.1.4, REST API open at `/wp-json/` | yes | Pages, posts, media and categories are readable anonymously |
| Products | `wc/store/v1` (already used by this site) | Keep: catalogue, prices, variations, basket |
| Blog | `wp/v2/posts`: 10 posts, category "locks", **plain HTML** content (no page-builder markup), excerpt, featured image | Ready to render headless as-is |
| Pages | `wp/v2/pages`: content is Elementor-rendered HTML (front page = 37 KB of Elementor divs) | **Not portable.** Page layouts are rebuilt in Next (already done); only copy should come from WordPress |
| Structured content (ACF, custom post types) | none (`wp/v2/types` empty, no ACF REST) | To be added |
| GraphQL | none (`/graphql` 404) | Not needed; core REST is enough |
| SEO | Rank Math installed, headless `getHead` route **not enabled** | Enable it, or register its meta in REST |
| Forms | Elementor Pro forms (guarantee, trade: proven proxy), Fluent Forms installed (management routes only) | Keep the Elementor proxy pattern; Fluent Forms possible later |
| Reviews | **Trustindex** plugin (`trustindex/v1/get-widgets`) | A lead for the pending reviews task: Trustindex syncs Google/Trustpilot reviews into WordPress |
| Menus | `wp/v2/menus` needs authentication in core | Keep nav in code or expose via a tiny mu-plugin |
| AI/agent access | WP 7.1 `mcp` and `wp-abilities/v1` namespaces present | Optional: editors could update copy through an MCP client |

## Recommended architecture

```
WordPress (wdlocks.co.uk)                         Next.js (Vercel)
─────────────────────────                         ───────────────────────────────
WooCommerce  ── Store API ───────────────────────► products, basket (today)
Posts        ── wp/v2/posts ─────────────────────► /blog, /blog/[slug]
ACF option pages + CPTs ── wp/v2/* (+ acf) ──────► homepage copy, truths, FAQs, accreditations, guarantee terms, trade copy
Media        ── wp/v2/media ─────────────────────► next/image (remotePatterns: wdlocks.co.uk)
Rank Math    ── rankmath/v1/getHead ─────────────► generateMetadata()
save_post hook ── POST /api/revalidate ──────────► revalidateTag('posts' | 'content')
Application Password ── authenticated reads ─────► draft preview (Next draft mode)
Elementor forms ── admin-ajax proxy ─────────────► /api/guarantee, /api/trade (today)
```

### 1. Keep the split that already works
Commerce (catalogue, basket, checkout, payment) stays WooCommerce. Layouts and interaction live in Next. WordPress becomes
the place editors change **words, images, FAQs and figures**, never layout. Elementor keeps running the WordPress-rendered
pages until the domain cuts over, then those pages can redirect to the Next routes.

### 2. Content model in WordPress (ACF, free)
Install ACF and tick "Show in REST API" on each group (ACF 6 exposes fields under `acf` on the REST object, no extra
plugin). Model what is hard-coded in `src/lib/constants.ts` today:

| Group | Type | Fields | Replaces in code |
|---|---|---|---|
| Site settings | ACF options page | announcement bar, phone, freephone, email, address, socials, opening hours | `SITE`, `ANNOUNCEMENT`, `CONTACT` |
| Homepage | options page | hero eyebrow/headline/sub, home-truths figure + claim + source, buy-band copy, why-Watchdog statement | `HOME_TRUTHS[0]`, hero strings |
| Accreditations | CPT `accreditation` | logo, eyebrow, title, body, order | `TRUST_SIGNALS`, `Accreditations` items |
| FAQs | CPT `faq` with a taxonomy (product, guarantee, trade, contact) | question, answer | `PRODUCT_FAQS`, `GUARANTEE_PAGE.faq`, `TRADE.faq` |
| Guarantee | options page | benefits, figures, conditions, steps, terms URL | `GUARANTEE_PAGE` |
| Trade | options page | reasons, steps, business types | `TRADE` |
| Product extras | ACF on WooCommerce products | pills, bullets, subtitle, feature tiles | `PRODUCT_PILLS`, `PRODUCT_BULLETS`, `PRODUCT_FEATURES` |
| Home truths | CPT `truth` | stat, claim, title, body, source, render | `HOME_TRUTHS` |

Rule: every field gets a typed reader in `src/lib/cms.ts` validated with zod, with the current constants as the fallback
when WordPress is unreachable or a field is empty. The site must never go blank because the CMS is down.

### 3. Fetching, caching, revalidation
- Server components fetch with `fetch(url, { next: { revalidate: 300, tags: ['content'] } })`; products keep their
  60 s revalidate.
- A 20-line mu-plugin on `save_post` / `acf/save_post` POSTs `{ tag, secret }` to `/api/revalidate`, which calls
  `revalidateTag`. Editors see changes within seconds; no rebuilds.
- Blog HTML goes through the existing sanitiser (`src/lib/sanitize.ts`) and the `prose-wd` styles; featured images and
  in-content images through `next/image` with `images.remotePatterns` for wdlocks.co.uk (CSP already allows the host).

### 4. SEO
Enable Rank Math's headless support (Settings → General → Headless) so `/wp-json/rankmath/v1/getHead?url=` returns the
title, description, canonical, OG and JSON-LD per post. Map it in `generateMetadata`; keep Next's own metadata for the
pages that have no WordPress twin (basket, checkout, configurator states).

### 5. Preview and auth
Create a WordPress user with the Editor role and an **Application Password**, stored only as a server env var. Next
draft mode (`/api/preview?secret&type&id`) fetches `status=draft` with that credential and renders the page with
`draftMode()` on; publishing clears it through the revalidate hook.

### 6. Forms, reviews, menus
- Forms: keep proxying to Elementor Pro forms (works, tested). If the client moves forms to Fluent Forms, the same
  proxy pattern applies (`admin-ajax.php?action=fluentform_submit`).
- Reviews: Trustindex is installed. Its widgets carry the review feed the client has connected (Google, Trustpilot);
  find the widget id in WP admin → Trustindex, then read it server-side and render our own review slider. This is the
  cleanest answer to the "verified reviews source" blocker.
- Menus: either keep `NAV_LINKS` in code (recommended; menus are part of the layout) or expose `wp_get_nav_menu_items`
  through a small REST route in the mu-plugin.

### 7. Security and operations
- Disable public user enumeration (`/wp/v2/users`) and keep XML-RPC off.
- The host's WAF answers HEAD with 403 and rate-limits bursts; all reads are server-side GETs with caching, so this is
  fine, but keep the fallback constants.
- Media: upload once in WordPress, serve through `next/image`; set a max width (1600) and WebP in the optimiser.
- Domain cutover later: WordPress moves to a subdomain (e.g. `cms.wdlocks.co.uk` or stays as the checkout host); the
  checkout handoff URLs are already a single constant (`WC_BASE`).

## Migration order (each step ships on its own)
1. **Blog** from `wp/v2/posts`: `/blog` index + `/blog/[slug]`, sitemap, Rank Math metadata. No WordPress changes needed.
2. ACF + site settings and FAQs (small, high value: editors stop asking for copy changes).
3. Homepage copy, home truths, accreditations, guarantee and trade option pages; delete the matching constants.
4. Product extras on the WooCommerce product edit screen.
5. Preview mode and the revalidate mu-plugin (do this together with step 2 so editors see changes).
6. Trustindex reviews feed → review slider on home, product, contact and home-truths pages.

## Effort
Step 1: half a day. Steps 2–5: about two days including the mu-plugin and the ACF groups. Step 6: half a day once the
widget id is known. The client needs to install ACF and the mu-plugin (`backend/` already holds the cart-handoff plugin
for the same reason).
