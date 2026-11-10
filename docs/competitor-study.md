# Competitor study: ultion-lock.co.uk vs WD Locks

**Date:** 2026-11-10 · **Author:** Claude (autonomous overnight run) · **Status:** draft → reviewed by an independent agent (see §9) → implemented (see §8)

Scope: every visible click path on https://www.ultion-lock.co.uk/ (homepage, navigation, hover behaviour, product
pages, configurators, basket, checkout up to the payment step), the old WooCommerce site at https://wdlocks.co.uk/
(home, shop, product page, side cart, checkout), and the new headless storefront at
https://wdlocks-frontend.vercel.app/. Nothing was purchased and no personal data was entered on either site; the
checkout was studied to the payment form and the test baskets were emptied afterwards. The AI chat widget on the
Ultion site was ignored on instruction.

Method: live browsing at 1366×900 and 390×844 with network-request and stylesheet inspection, static fetches of the
HTML, the public WooCommerce Store API of both stores, and a parallel crawler agent for the site map, catalogue and
tech stack (its findings are in §10).

---

## 1. Why "Checkout securely" goes to the old WD Locks site

It is by design in the original brief ("Checkout = redirect to wdlocks.co.uk/checkout/"), not a bug. The headless
site owns browsing and the basket; WooCommerce still owns payment. Three constraints make the hand-over visible:

1. **Payment lives in WooCommerce.** The gateways (WooPayments cards/Google Pay, PayPal, Trustly) are configured on
   wdlocks.co.uk. Taking payment on the new domain means either embedding WooCommerce's Store API checkout with a
   gateway that supports headless (Stripe does; WooPayments does not expose a public headless flow) or moving the
   store to Stripe.
2. **Sessions do not cross domains.** The shopper's basket is a Store API session held by our proxy; the browser has
   no WooCommerce cookie for wdlocks.co.uk, so we re-create the basket on arrival via WooCommerce's add-to-cart URL
   (one line natively, every line once `backend/wd-cart-handoff.php` is installed).
3. **The old checkout is unbranded for this journey.** It still shows the old header and a long form (see §5.4), so
   the jump feels like leaving the site.

What Ultion does instead: it is one WordPress site, so "Checkout Now" goes straight to a heavily customised
WooCommerce checkout on the same domain (no cart page), with a stripped header and Trustpilot strip. The equivalent
for WD Locks is either (a) restyle the WooCommerce checkout page to match the new brand and strip its header
(cheapest, a WordPress theme change), or (b) build a native checkout on the headless site with Stripe Elements +
Store API `/checkout` (what `@stripe/stripe-js` was installed for). Recommendation: (a) now, (b) in phase 2.

---

## 2. Ultion: site anatomy and click-by-click notes

### 2.1 Technology (observed)
- WordPress (Bedrock layout: `/app/themes/consultancy`, `/wp/wp-includes`), WooCommerce 10.1.2, custom theme by
  "The Consultancy". ~295 requests on homepage load; six autoplay MP4 background videos (desktop + mobile variants),
  Vimeo embeds for the "watch full video" overlays.
- Commerce plugins: WooCommerce Blocks mini-cart, Stripe (UPE + Express Checkout element), Klarna Payments, PayPal,
  Product Bundles, Product Add-Ons, Product Extras (PEWC), Woo Custom Product Add-ons, Variation Swatches Pro,
  Additional Variation Images. Marketing: GTM (`GTM-PZ2NQF2`), Facebook pixel, OneTrust consent, Jetpack stats,
  Trustpilot widgets. Public Store API exposes 90 products (locks are configured as variable products with 100+
  variations: e.g. "3 Star Lock to Code" has 131 variations).
- The lock product itself is sold through a bespoke configurator page (`/get-locks/product/`) and keys through
  `/get-keys/product/`; standard WooCommerce product pages are used for accessories.

### 2.2 Header and navigation (desktop)
- Dark (near-black) bar. Left: "ULTION | STAYS LOCKED" logo. Centre: **Get Keys · Locks ▾ · Handles ▾ ·
  Accessories ▾ · Talk to us**. Right: outlined orange pill **Activate guarantee**, basket icon with count.
- Under the header: an orange utility strip "Looking to buy extra keys? Click here" (changes per page: "extra
  locks" on the locks page; a yellow "★ ORDER TODAY, DELIVERS TOMORROW ★" marquee on product pages).
- **Mega-menu on hover** (no delay, fade in): a full-width dark panel with a row of 3–5 product **cards** (dark-grey
  rounded tiles: product photo, name, one-line benefit, orange "Buy Online" pill, optional ghost "Explore" pill,
  orange "POPULAR" badge, "Works with Apple Find My" badge) plus a right column **"More Products"** of underlined
  text links. A thin strip under the panel shows Trustpilot stars "12500+ reviews".
  - Locks ▾: 3 Star PLUS Lock · Ultion Nuki · Ultion Nuki Go | More: Ultion Padlock, Ultion Bolt.
  - Handles ▾: 2 Star · 2 Star PLUS (POPULAR) · Long Lever (DDA) · Patio Handle | More: Security Handles, Blanking
    Plates, Nuki 2025, Nuki Go.
  - Accessories ▾: KeyTag (POPULAR) · KeyCap (POPULAR) · KeyLight · Lock Lubricant (POPULAR) · Door Accessories.
- **Hover mechanics (from the live stylesheet):**
  - Card background image: default `filter: grayscale(30%); opacity: .15` (or .2/.25 for `brighten`/`brightest`
    cards); on `.product:hover` → `filter: grayscale(0); opacity: .4–.65`, `transition: opacity .3s ease-in-out`.
    This is the "extra light" effect: the photo brightens and regains colour behind the text.
  - Nav link hover colour → yellow `rgb(254,203,62)` over .3s; buttons fill orange `rgb(242,113,47)`; footer link
    underline fades out via `text-decoration-color: transparent`.
  - Variation swatches: hover = white bg + 3px #ddd ring; selected = 2px black ring; disabled = 60% opacity with a
    cross; out-of-stock = strikethrough.
- First-visit flow: OneTrust cookie bar (Preferences / Reject All / Accept) → **"Welcome to Ultion" segmentation
  modal**: "have you bought an Ultion lock before? — No, I am new to Ultion / Yes, I have an Ultion lock" (routes
  owners to keys/guarantee, newcomers to locks).

### 2.3 Homepage sections (in order)
1. Hero: full-bleed autoplay video of a break-in; eyebrow "Ultion Lock Protection"; 3-line H1 "In **9 seconds**
   you'll want to replace your lock" (number in orange); CTAs "Get an Ultion Lock" + "▶ Watch full video (1:18s)";
   floating card "Get your £5000 guarantee → Activate Now"; "12500+ reviews"; "Are you an installer? Click Here".
2. "OUR PRODUCTS" pill → H2 "Find the right protection for you" → 2×4 light-grey cards (3 Star PLUS Lock, Keys,
   KeyTag, NUKI, Lubricant, 2 Star PLUS Handle, 2 Star Handle, Padlock), each photo + name + benefit + "Buy Now".
3. "The very best protection for British homes" + "Fitting the highest security protection is the key" (exploded
   lock video).
4. **Home Truths** stat: "64% of burglaries happen when someone is at home → Learn more".
5. "Buy more Ultion locks and keys here" (keys / locks / find an Ultion Centre).
6. Ultion Bolt multipoint + Nuki smart-lock stories.
7. "The UK's thickest key" · "One key for all locks" (keyed-alike, video) · KeyTag "Stop losing keys".
8. Key security promise (Key Control) → Activate / Watch video.
9. "PROTECTED BY ULTION — Register your £5,000 guarantee".
10. "See Ultion in action": horizontally scrolling carousel of 7 CCTV/customer videos with durations.
11. Accreditation trio: Sold Secure Diamond (MLA) · Police Preferred Specification (SBD) · BSI Kitemark Grade 6
    3-star.
12. Ultion Sweet door-furniture promo.
13. Footer: Popular / Locks / Handles / Accessories / Furniture / Support columns; "THE HOME OF HOME SECURITY.";
    phone; "12500+ reviews"; address; legal links; company number; media contact.

### 2.4 Click path A — homepage "Buy Now" → configurator → checkout
1. **Buy Now (3 Star PLUS Lock)** → `/get-locks/product/` (configurator, not a PDP). Marquee "ORDER TODAY,
   DELIVERS TOMORROW". Left gallery swaps between six named renders (Key/Thumbturn × Dual Colour/Chrome/Brass).
   Right: badges "TS 007 CERTIFIED" "ANTI-SNAP", H1, **£63**, six USP bullets (£5,000 guarantee · Sold Secure
   Diamond · Police preferred/SBD · molybdenum core + lockdown mode · 60% thicker key · free Key Control).
2. Fields: "Enter keycode to use existing Ultion key with this lock (Learn More)"; grey panel "This lock includes 3
   Ultion Keys as standard" with **Extra Keys stepper**, **Internal Control** (Key Operated / Thumbturn), **Colour**
   swatches, **Internal Size** and **External Size** selects (10–75 mm), helper "Composite doors are usually 35mm and
   35mm. View lock measuring guide." **Defaults are preselected** (Key, Dual Colour, 35/35) so a shopper can buy with
   zero decisions.
3. **Add another lock** clones a second block and reveals "Use different keys for each lock / Use the same key for
   all locks" (keyed-alike), total updates live (£63 → £126). Sticky summary "TOTAL · QTY · Checkout Now".
4. **Checkout Now** → POST `admin-ajax.php?action=checkout_products` → redirect straight to **`/checkout/`** (cart
   page skipped). Stripped header (logo + Trustpilot "12500+ Reviews"). Collapsed "Got a Coupon?". **Shipping
   Details**: Email, Phone, First, Last, **Find Address via Postcode**, "Shipping Address same as Billing Address"
   (ticked). **Payment**: Stripe card fields inline (Visa/MC/Amex/Discover icons), PayPal, Klarna "Pay over time /
   Pay in full today / Pay later"; Stripe Express Checkout element present for Apple/Google Pay. **Order Summary**:
   line with configured attributes (35int/35ext · Standard Colour · 3 Star Plus), qty stepper, bin; Subtotal £126;
   Shipping "DPD: £7.95"; "Total inc VAT £133.95"; terms checkbox; orange **Complete purchase**; **"Delivers Wed
   11th November"** (computed delivery date); Trustpilot quote carousel underneath.
5. Removing the line → `/cart/`: orange trust strip (3 million+ homes · £5,000 guarantee · 12500+ reviews), "'Ultion
   locks' removed. Undo?", empty-cart notice, "Return to homepage", review carousel.

### 2.5 Click path B — Get Keys
`/get-keys/product/` ("Genuine Ultion Keys - Delivered Next Day - Official Store"): warning pill "Non-genuine Keys
Damage Your Lock & Invalidate Your Guarantee"; H1 "The Ultion Key©", £22.50, seven USP bullets; **"How many keys do
you need?" 1–6 radio chips with 3 preselected** + "We recommend ordering enough keys to leave a spare"; keycode
input "(engraved on your current key)"; single CTA **"Get price and buy"**; anti-counterfeit copy; Key Control
explainer.

### 2.6 Click path C — standard product page (KeyTag)
Yellow marquee; "Want to speak to an expert? Call us on 0115 6714033"; orange H1; tiered price "£39 / £99 for 3";
"Works with Apple Find My" badge; compatibility warning "Does not work with Android."; colour dropdown; mandatory
KeyCode (inline validation "Please enter some text in this field."); "How many KeyTags do you need?" stepper; Add to
Basket; product-specific review carousel; long feature storytelling with repeated "Buy KeyTag" CTAs.

### 2.7 Category landing (Locks)
`/ultion-locks/` is a brand landing page, not a grid: pill "ULTION LOCKS", giant H1 "The Ultion 3★PLUS", 3-line
intro, "Get Price" → configurator, "▶ See How It Protects Your Home (1:17s)", large render, reviews, features.

### 2.8 Basket drawer and mobile
- Basket icon → WooCommerce Blocks mini-cart drawer from the right; empty state "Your cart is currently empty!";
  the drawer template carries a **"Don't Forget — Lock Lubricant £12.95 — Quick Add"** upsell.
- Mobile (390 px): large logo + basket + hamburger; orange keys strip; hero still with stacked full-width CTAs
  ("Get an Ultion Lock", outlined "Activate £5,000 guarantee"); product cards one per row. Hamburger opens a
  **full-screen dark menu** (Keys · Locks ▾ · Handles ▾ · Accessories ▾ · Home Truths · Contact), then a "MOST
  VIEWED" pill with five quick links (Get More Keys, Activate My Guarantee, Nuki Go, 3 PLUS Lock, Buy Lock
  Lubricant) and a sticky "Activate Guarantee" button. Negative: the large "Chat" tab overlaps the hero CTA edge.

---

## 3. Old WD Locks site (wdlocks.co.uk) — what the customer sees today

- **Stack:** Astra child theme + Elementor/Elementor Pro, Side Cart WooCommerce, YITH Ajax Product Filter, Woo
  Variation Swatches, Woo Custom Product Add-ons (the "Existing Key Number" field), WooPayments (cards, Google Pay),
  PayPal Payments, Trustly, Fluent Forms, Facebook for WooCommerce, Google Listings & Ads, CookieFirst, Independent
  Analytics, Woo Blocker (fake-order blocking), GTM, ClickTrue click-fraud script. Homepage: 43 CSS/JS files ≈ 1.3 MB
  before images, 18 images (7 lazy). Built by Born2Web.
- **Palette (computed on /shop/):** white background, charcoal `#292734` text, WD red `#DA1519` buttons, darker red
  `#C00802`, light blue-grey `#DDE6ED`, navy `#27374D`; Inter throughout. (The new site keeps charcoal + WD red and
  swaps white for the cream family.)
- **Homepage:** nav Home · Shop · Contact · Trade · Guarantee · Blog · Locksmiths + "CALL 0203 857 4718". No basket
  icon, no mega-menu. Shouty all-caps hero "3 STAR ALPS DOOR LOCKS PASSES EVERY SECURITY TEST" with **two H1s** and
  text overlapping the image at 1366 px; sections HOW WE PROTECT YOU / AS SEEN ON / ARMOUR FOR YOUR HOME / 800,000+
  KEY COMBOS / TOUGHEST TEST / BRITISH STANDARDS / SECURED BY DESIGN / NEXT DAY DELIVERY / INSTALLATION VIDEO /
  £5K GUARANTEE. No prices, no reviews widget (Checkatrade badge only), no delivery cost.
- **Shop:** 4-column white cards, red "SELECT OPTIONS"/"ADD TO BASKET", price *below* the button, "This product
  has multiple variants…" helper on cards, default sort "price: high to low".
- **Product page:** 17 size pills with **no default and no explanation of inside/outside** (the sizing diagram is
  buried in the description tab); **raw CSS printed as visible text** in the description (`.watchdog-product-copy
  .watchdog-video-wrapper {…}`); PayPal / Pay Later / G Pay buttons on the PDP; "Guaranteed Safe Checkout" logos.
- **Side cart:** item + "Secure Checkout · Fast Shipping · Easy Returns" icons; red block "Next Day Delivery:
  Cut-off time is 3pm…"; View Cart / Continue Shopping / "Checkout – £41.39".
- **Checkout:** classic WooCommerce page with the full site header (exit routes), login + coupon toggles, 11 billing
  fields with no postcode lookup, order notes, shipping radios Royal Mail 1st Class Signed For £6.40 (3–5 days,
  default) / Special Delivery 24hr £10.00 / Saturday £28.80, Total £41.39 incl. £6.90 tax, PayPal preselected with
  yellow PayPal buttons as the primary CTA, cards/Google Pay/Trustly secondary, and the entire T&Cs document
  rendered on the page.

---

## 4. Gap analysis

| Area | Ultion | Old WD Locks | New headless site (before tonight) | Verdict |
|---|---|---|---|---|
| Header | dark bar, 3 mega-menus, guarantee CTA, basket count | light bar, flat links, phone CTA, no basket | cream sticky bar, one mega-menu (text list), basket badge | Add card-style mega-menus with hover brighten, guarantee CTA |
| Utility strip | contextual orange/yellow strip (keys / delivery marquee) | none | red announcement bar | Make it contextual per page type |
| Hero | video, 3-line headline, number accent, 2 CTAs, guarantee card, review count | caps text over image, 1 CTA | serif headline, 2 CTAs, stats row | Add guarantee card + review count + video/still option |
| Products section | 8 cards with benefit line + Buy Now | shop grid only | 8 cards from live API | Add benefit line + "POPULAR" badge (done partly) |
| Size selection | configurator: defaults preselected, internal/external selects, helper copy, measuring guide, extra keys, keyed-alike, add another lock | 17 pills, no default, no help | swatch grid with diagram, no default, qty | Preselect 35/35, add "add another lock" + keyed-alike upsell + extra keys |
| Trust | £5,000 guarantee everywhere, 12500+ Trustpilot, SBD/Sold Secure/Kitemark trio, "3 million homes", customer video carousel, quotes on every commerce page | badges, Checkatrade | badges strip, Trustpilot link | Add guarantee messaging + review count + accreditation explainers; no fabricated quotes |
| Delivery promise | "ORDER TODAY, DELIVERS TOMORROW", computed "Delivers Wed 11th November", DPD £7.95 | side-cart red notice, Royal Mail options | "Same-day dispatch before 3pm" | Add computed delivery-date promise + shipping options preview |
| Cart | mini-cart drawer + lubricant Quick Add upsell; cart page with trust strip & Undo | side cart with icons + notice | drawer with inc-VAT subtotal | Add lubricant/keys Quick Add upsell and Undo on remove |
| Checkout | same-domain, one page, stripped header, postcode lookup, Stripe/PayPal/Klarna/express, delivery date | full header, long form, PayPal-first | redirect to old checkout | Phase 1: restyle WP checkout; Phase 2: native Stripe checkout |
| Mobile nav | full-screen menu + MOST VIEWED + sticky guarantee CTA | hamburger list | left drawer with product list | Add "Most viewed" quick links + sticky CTA |
| Segmentation | new vs existing owner modal | none | none | Add non-blocking "Already own a Watchdog lock?" toggle (keys / guarantee) |
| Keys ordering | dedicated page, qty chips 1–6 (3 default), keycode, anti-counterfeit copy | WooCommerce add-on field (headless can't submit) | links out to old site | Build /keys page mirroring Ultion; submit via handoff URL with key number (phase 2) |
| Performance | heavy (videos, ~295 requests) | heavy (1.3 MB CSS/JS) | ~250 KB gz JS, SSG | Keep lean; no autoplay video by default |
| Content | Home Truths stats, blog, guarantee registration, installer/trade | blog, trade, guarantee | none | Add "Why Watchdog" stats + link to guarantee/trade pages |

---

## 5. Improvement backlog (prioritised)

**P0 — ship tonight (implemented in §8)**
1. Card-style **mega-menus** for Locks / Keys & Aftercare / Accessories with product photo, benefit line, "Buy
   Online" + "Explore", POPULAR badge, and the **hover brighten** effect (greyscale→colour, opacity .15→.5, 300 ms).
2. **Guarantee CTA** in the header ("Activate £5K guarantee" → wdlocks.co.uk/guarantee-registration/) and a
   contextual utility strip (keys on product pages, dispatch promise elsewhere).
3. **Hero upgrade**: numeric accent headline, guarantee card, review/accreditation line, cream textured background.
4. **Homepage sections** in Ultion's proven order: products → "Home truths" stats → how it works (video embed from
   the live site) → guarantee → accreditation explainers → delivery.
5. **Product page / size picker**: preselect the most common size (35/35), show internal/external labels, extra-keys
   and keyed-alike upsells, "Add another lock" quantity nudge, computed **delivery-date promise**, shipping options
   preview (Royal Mail £6.40 / Special Delivery £10 / Saturday £28.80 as on the live store).
6. **Cart drawer**: Quick-Add upsell tiles (Lubricant, Extra Keys), "Undo" after remove, trust icons row, dispatch
   notice, delivery-date promise.
7. **Mobile menu**: "Most viewed" quick links + sticky guarantee button.
8. Cream texture (subtle noise/grain) and the wdlocks.co.uk accent palette (`#DA1519`, `#C00802`, `#292734`,
   `#27374D`, `#DDE6ED`) applied as tokens.

**P1 — this week**
9. Restyle the WooCommerce checkout page on wdlocks.co.uk: hide header nav, add Trustpilot/accreditation strip,
   postcode lookup, cards before PayPal, remove the inline T&Cs document. (WordPress change.)
10. Install `backend/wd-cart-handoff.php` and set `NEXT_PUBLIC_CART_HANDOFF_PLUGIN=true` so multi-line baskets
    transfer.
11. Keys page on the headless site (quantity chips, key number field) once the handoff plugin can carry add-on
    fields.
12. Real reviews: Trustpilot or Google Reviews widget with the actual rating; never hard-coded quotes.
13. Segmentation prompt (new vs existing owner) as a non-blocking banner.

**P2 — later**
14. Native checkout (Store API `/checkout` + Stripe Elements) so the customer never leaves the new domain.
15. Customer video carousel ("See Watchdog in action") when the client supplies footage.
16. Blog / Home Truths content pages pulled from WordPress via the REST API.

---

## 6. Things NOT to copy
- Autoplay hero video and six background MP4s (performance, accessibility, data).
- Blocking "Welcome" modal on first visit (interrupts; use an inline prompt).
- Chat tab overlapping the mobile CTA.
- Fabricated/placeholder testimonials — only real, attributable reviews.
- Preselecting PayPal over cards at checkout (old WD Locks).

---

## 7. Palette and texture decisions
- Cream family stays as the canvas: `--cream #F8F3EC`, `--cream-mid #F0E9DF`, `--cream-dark #E6DDD0`,
  `--warm-white #FDFAF6`, with a subtle SVG grain overlay for the "creamy texture".
- Accents from wdlocks.co.uk/shop: WD red `#DA1519` (primary), deep red `#C00802` (hover), charcoal `#292734`
  (text), navy `#27374D` (dark panels, replaces near-black where a softer dark is wanted), blue-grey `#DDE6ED`
  (borders on dark panels).
- Type: Playfair Display for display headings, Inter for everything else (matches the old site's Inter).

---

## 8. Implementation log (tonight)
_Filled in as the work lands; see git history for the exact diff._

## 9. Independent review
_To be appended by the reviewer agent after it re-visits ultion-lock.co.uk and cross-checks every claim above._

## 10. Appendix — crawler findings (site map, catalogue, tech, SEO)
_Appended from the crawler agent's report._
