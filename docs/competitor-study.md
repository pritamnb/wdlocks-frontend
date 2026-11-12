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
  Trustpilot *imagery* — **corrected after review: there is no Trustpilot script; the stars are a static SVG, "12500+ reviews" is hard-coded text and every review carousel is hard-coded HTML**. Public Store API exposes 90 products (locks are configured as variable products with 100+
  variations: e.g. "3 Star Lock to Code" has 131 variations).
- The lock product itself is sold through a bespoke configurator page (`/get-locks/product/`) and keys through
  `/get-keys/product/`; standard WooCommerce product pages are used for accessories.

### 2.2 Header and navigation (desktop)
- Dark (near-black) bar. Left: "ULTION | STAYS LOCKED" logo. Centre: **Get Keys · Locks ▾ · Handles ▾ ·
  Accessories ▾ · Talk to us**. Right: outlined orange pill **Activate guarantee**, basket icon with count.
- Under the header: an orange utility strip "Looking to buy extra keys? Click here" (changes per page: "extra
  locks" on the locks page; a yellow "★ ORDER TODAY, DELIVERS TOMORROW ★" marquee on product pages).
- **Mega-menu on hover** (instant toggle — the review found no transition on `.sub-menu`): a full-width dark panel with a row of 3–5 product **cards** (dark-grey
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
  - Nav link hover colour → yellow `rgb(254,203,62)` over .3s; the outlined header CTA fills orange `#f2712f` while solid buttons hover to `#f37b3d`; footer link
    underline fades out via `text-decoration-color: transparent`.
  - Variation swatches: hover = white bg + 3px #ddd ring; selected = 2px black ring; disabled = 60% opacity with a
    cross; out-of-stock = strikethrough.
- First-visit flow: OneTrust cookie bar (Preferences / Reject All / Accept) → **"Welcome to Ultion" segmentation
  modal**: "have you bought an Ultion lock before? — No, I am new to Ultion / Yes, I have an Ultion lock" (routes
  owners to keys/guarantee, newcomers to locks).

### 2.3 Homepage sections (in order)
1. Hero: full-bleed autoplay video of a break-in; eyebrow "Ultion Lock Protection"; 3-line headline "In **9 seconds**
   you'll want to replace your lock" (number in orange; **it is an `<h2>` — the homepage has no `<h1>`**); CTAs "Get an Ultion Lock" + "▶ Watch full video (1:18s)";
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
4. **Checkout Now** → POST `admin-ajax.php?action=locks_add_products_to_basket` (corrected after review; the page also
   calls `get_lock_product_sizes`, `get_locks_totals` and `delivery_date_notice`) → `window.location.replace` to **`/checkout/`** (cart
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
`/ultion-locks/` is a brand landing page, not a grid: pill "ULTION LOCKS", giant headline "The Ultion 3★PLUS" (an `<h2>`; no `<h1>` on the page), 3-line
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
| Content | Home Truths stats + postcode crime checker, blog, guarantee registration form, keyed-alike comparison table, callback form with opening hours (installer link goes off-site to brisant-secure.com — Ultion has no trade page) | blog, **trade application page**, guarantee | none | Add "Why Watchdog" stats, comparison table, surface WD's own trade page |

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

**P0b — added from the crawler's top-15 (implemented tonight where marked ✓)**
- ✓ FAQ accordion per product with FAQPage schema.
- ✓ Variation preselection from query string for menu/ad deep links.
- ✓ Installer/trade link on every page.
- Keycode as the universal identifier: one validated "key number" field shared by extra keys, keyed-alike and guarantee registration (needs the handoff plugin to carry add-on fields).
- Trust strip on the empty basket state and cart page ("3 million+ homes · £5,000 guarantee · reviews" pattern) — use only verified WD figures.
- Callback request path (time-slot picker) as a conversion route for undecided buyers.

**P1 — this week (expanded after review)**
8a. Rewrite the guarantee copy so it no longer paraphrases Ultion's, and decide with the client whether to keep the term "KeyControl" (Ultion uses the same word; the old WD site also does).
8b. Request-a-callback form with opening hours and a time-slot picker; add the second phone line (freephone) with a clear label.
8c. Keycode validation (one letter + 7–8 digits on Ultion; confirm WD's format) shared by extra keys, keyed-alike and guarantee registration.
8d. State shipping zones explicitly (UK only, per the old site's terms).
8e. Record and use the price advantage: WD keys £12 vs Ultion £22.50; WD lock £34.99 vs Ultion from £53.
9. Restyle the WooCommerce checkout page on wdlocks.co.uk: hide header nav, add Trustpilot/accreditation strip,
   postcode lookup, cards before PayPal, remove the inline T&Cs document. (WordPress change.)
10. Install `backend/wd-cart-handoff.php` and set `NEXT_PUBLIC_CART_HANDOFF_PLUGIN=true` so multi-line baskets
    transfer.
11. Keys page on the headless site (quantity chips, key number field) once the handoff plugin can carry add-on
    fields.
12. **PENDING (client decision, 2026-11-10):** Real reviews. Pritam has parked this as a pending task. Needs the
    client to pick the source (Trustpilot / Google / Checkatrade) and share the profile URL; then embed the widget
    with the live rating and replace the "Read independent reviews" link in `Reviews.tsx`. Never hard-coded quotes.
13. Segmentation prompt (new vs existing owner) as a non-blocking banner.

**P2 — later**
13a. Postcode crime checker (Police data) as on Ultion's Home Truths page.
13b. Owner hub page (guarantee status, key re-orders, fitting videos).
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
- Hard-coded named review quotes with a static star image and no review schema (Ultion).
- Pages with no `<h1>` and generic titles like "Home - Ultion Lock" (Ultion).
- Two unlabelled phone numbers; terms that say UK-only while the checkout ships to IE/FR (Ultion).
- Naming collision risk: Ultion markets an "ALPS" range; WD's flagship is the "3 Star ALPS". Keep WD's wording distinct and attribute Brisant Secure where appropriate.

---

## 7. Palette and texture decisions
- Cream family stays as the canvas: `--cream #F8F3EC`, `--cream-mid #F0E9DF`, `--cream-dark #E6DDD0`,
  `--warm-white #FDFAF6`, with a subtle SVG grain overlay for the "creamy texture".
- Accents from wdlocks.co.uk/shop: WD red `#DA1519` (primary), deep red `#C00802` (hover), charcoal `#292734`
  (text), navy `#27374D` (dark panels, replaces near-black where a softer dark is wanted), blue-grey `#DDE6ED`
  (borders on dark panels).
- Type: Playfair Display for display headings, Inter for everything else (matches the old site's Inter).
- For contrast, Ultion's system is Adobe Fonts Sofia Pro + Alternate Gothic No.2 on `#090909` with orange `#f2712f` (hover `#f37b3d`), yellow `#fecb3e` and grey `#f4f4f4`. The cream/charcoal/red direction here is a deliberate divergence, not an omission.

---

## 8. Implementation log (tonight)

Commit `ac4beda` (deployed to https://wdlocks-frontend.vercel.app, verified in the browser at 1366 px and 375 px):
- Card mega-menus for **Locks** and **Keys & Aftercare** with live Store API images and prices, "Popular" badges, muted→colour hover brighten (`.brighten-img`, 300 ms), "More" links, sizing-guide tile and an accreditation strip under the panel.
- Header **Activate £5,000 guarantee** CTA; contextual announcement strip (product pages: "Order today, dispatched today · order within Xh Ym" live countdown to the 3 pm cut-off; elsewhere: extra-keys nudge).
- Mobile menu: accordion product cards per group, **Most viewed** quick links, sticky guarantee button.
- Homepage: new hero (numeric accent, guarantee card, accreditation chip), Home Truths fact strip (11 pins · 3★ · ALPS · 5-minute fit), guarantee + accreditation section (Kitemark, Sold Secure, SBD, Checkatrade, "as seen on Sky Sports" from the old site), delivery options with computed arrival dates.
- Product page: most common size **preselected** (35/35, Brass), keyed-alike upsell checkbox (adds the £5 service line), extra-keys link, delivery promise with arrival dates per shipping option.
- Basket drawer: "Don't forget" quick-add tiles (Lubricant, Keyed-alike), **Undo** after remove, trust row, delivery promise.
- Cream paper-grain texture over the whole canvas; navy / blue-grey / deep-red tokens from wdlocks.co.uk/shop.

Second pass (after the crawler report, same night):
- FAQ accordion on product pages with **FAQPage JSON-LD** (the crawler notes Ultion has rich FAQs but emits no FAQ schema — an easy SEO win).
- Deep-link preselection of a size via `?size=35-35` or `?variation=5168` (Ultion pre-selects attributes from the mega-menu query string).
- "Are you an installer? Apply for trade →" link in the trust strip (Ultion separates B2C and trade on every page).

Third pass (after the independent review):
- Trust signals now use only verified marks (Checkatrade replaces the unverified "5★ Trustpilot" tile); the reviews section no longer asserts a star rating and links to independent reviews instead.
- Guarantee copy rewritten in WD's own words (no Ultion paraphrase); "KeyControl" replaced by plain "key-copy protection" pending the client's decision.
- "Standard cylinder vs Watchdog 3 Star ALPS" comparison table on the homepage (content-only, mirrors Ultion's keyed-alike comparison pattern using only claims already on wdlocks.co.uk).
- Delivery section states UK-only shipping; extra-keys card shows the £12 price advantage.

### Pass 4 — 10 Nov 2026, client imagery
Phil Else (Allegion) sent 13 Watchdog renders via Paramjit (Watchdog Fire & Security), thread "watchdog lock images required".
Used (trimmed, resized, transparent PNG in `public/brand/product/`): angled cylinder (hero + gallery), engraving close-up
(Why Watchdog + gallery), end-on view (Home Truths + gallery), engraved keys (Keys menu tile + keys/keyed-alike galleries),
£5,000 key tag (Guarantee section). Not used: the "1-Star PLUS" render (Ultion-branded), the white-background KeysOnRing
thumbnails and the small rim-cylinder JPEGs (the live store already has rim photos). Two videos (turntable animation 58 MB,
Watchdog.mp4 202 MB) arrived by WeTransfer; downloaded 10 Nov 2026 to
`/Users/pritam/Documents/wdlocks/client-assets/wetransfer-2026-11-10/` (outside the repo — too large for git). The turntable clip is now live as the homepage "Every angle. Every mark." section (near-black panel, 960px silent H.264 ~0.75 MB, plays only while on screen, poster for reduced-motion). Watchdog.mp4 (40 s explainer, with audio) is now live too: 720p H.264 (~3.7 MB) behind a click-to-play poster in the Why Watchdog section and under the cylinder gallery (opens the site modal, VideoObject schema on the product page); plus three silent chapter loops (dimple key 7–11 s, pins 11–20 s, ALPS cam 20–30 s) faded to white so they multiply-blend onto cream — pins and ALPS in the Home Truths tiles, dimple key under the gallery on the extra-keys and keyed-alike pages. Encoded with ffmpeg from client-assets/wetransfer-2026-11-10.

### Pass 5 — 10 Nov 2026, hover motions and description clean-up
- Hover-to-play: chapter clips fade in over product cards and mega-menu tiles (mouse/trackpad only, reduced-motion aware);
  the film poster previews the turntable loop. Shared `HoverPreview` component.
- The 3 Star cylinder description on wdlocks.co.uk contains raw CSS (`.watchdog-video-wrapper {…}`) pasted as text and an
  empty video wrapper because WordPress strips the embed from the Store API. The sanitiser now drops CSS-shaped paragraphs
  and fills the "Watch how the ALPS lock works" accordion with the self-hosted film. **Client should still delete the stray
  CSS from the product description in WooCommerce** — it shows on the old site too.
- Second WeTransfer from Allegion (10 Nov, expires 11 Nov 11:07 UTC): folder WATCHDOG, 6 items, 52 MB — 3-starPLUS.8.png,
  3Star-Explode-Image.6.png, 5K-half_card-light_background.png, Key.6-alpha.png, Key.6.png, KeyedAlike.Version3.mp4.
  Paramjit's note: "More video as in ultion website". Downloaded 10 Nov to
  `/Users/pritam/Documents/wdlocks/client-assets/wetransfer-2026-11-10b/WATCHDOG/` (outside the repo). PNGs are 4000–6000 px
  with alpha; the video is 6 s 4K with an audio track. **Every item in this batch, the video included, is Ultion-branded** (ULTION PLUS cylinder,
  ULTION .co.uk keys, exploded view engraved ULTION, £5000 tag reads "snaps Ultion… ultion.co.uk"). Not usable on a Watchdog
  site as-is; ask Allegion (Phil Else) for the Watchdog-branded versions, which clearly exist for the turntable/film renders.
  With Pritam's approval (10 Nov) one brand-free crop of the exploded view — cam carrier, anti-drill pins, springs, no housing
  engraving — is used in the Why Watchdog section (`public/brand/product/mechanism-exploded.png`). Replace it with the Watchdog
  exploded render when it arrives.

### Pass 6 — 10 Nov 2026, existing client assets put to work
Audit of Pritam's Mac and mailbox found most imagery had already been supplied on 6 Nov (see `docs/asset-register.md`). Now
live: 5000 px Watchdog render as the hero; Watchdog X-ray in Why Watchdog (the Ultion-derived crop is gone); Watchdog key
turntable on the keys pages; the 38 s "Inside the lock" macro film inline on the dark panel (muted in-view autoplay, sound on request, clickable chapters — Pritam rejected the modal version); the same inline treatment now carries the explainer in Why Watchdog (7–40 s cut, white fades, multiply-blended onto the cream); in-view playback fixed to pause when the player leaves the viewport; brochure PDF in the footer and
on product pages. Only a Watchdog exploded view and keyed-alike clip remain to ask Allegion for.

### Pass 7 — 10 Nov 2026, client QA feedback
Client (via Paramjit, WhatsApp): "stick to the black and red concept — instead of the orange [Ultion] use our red" and "add the
video bar as in [Ultion's 'See Ultion in action']". Done: header and footer are now near-black with white type, red accents and a
white-text logo variant; the announcement bar was already Watchdog red. New "See Watchdog in action" bar after the trust strip:
four cards (explainer 0:40, Inside the lock 0:38, cylinder turntable 0:10, key turntable 0:10) with duration and a red
"Watch full video" button opening a dark player with controls and sound. Decision (Pritam, 10 Nov): keep the cream canvas; black is for the header, footer and the
two film panels only. Customer-story / CCTV films like Ultion's do not
exist yet — the bar is built to take them when they do (add entries to `VIDEO_BAR`).

### Pass 8 — 10 Nov 2026, homepage rebuilt in Ultion's order
Per Pritam ("replicate this website for wdlocks, home page first"), the homepage now follows the section map in
`docs/homepage-replication-spec.md`: sticky black header + red utility bar · cinematic hero (turntable film behind the
headline, Watch full video, floating £5,000 card) · thin dark accreditation bar · centred "Find the right protection for you"
with Ultion-style product cards (all 9 products) · "The very best protection for British homes" (turntable + engraved marks) ·
"Fitting the highest security protection is the key" + inline explainer with chapters · Home Truths as one giant 3★ figure ·
red "Buy more Watchdog locks and keys" band · "The Watchdog dimple key" · "One key for all locks" (keyed-alike) · Inside the
lock · dark "Register your £5,000 guarantee" · See Watchdog in action · three accreditation explainers · delivery · footer with
a Popular column. Dropped from the homepage: the feature cards + Standard-vs-Watchdog comparison table (candidate for the
product page), the X-ray panel, and the Reviews section (no verified source yet). Skipped Ultion sections with no Watchdog
product: Bolt/Nuki smart locks, KeyTag, Ultion Sweet. Asset gaps unchanged (hero door film, exploded render, keyed-alike clip,
Home Truths photo).

### Pass 9 — 10 Nov 2026, cylinder product page rebuilt to Ultion's configurator
Per `docs/product-page-replication-spec.md`: certification pills + H1 + price + six benefit bullets; configurator card with
"includes 3 keys", Key operated / Thumb turn switch (links between the two products carrying the size), Satin nickel finish
chip, Inside/Outside size selects driven by the 17 live variations with the "composite doors are usually 35mm and 35mm" hint,
keyed-alike toggle, quantity, [Add to basket] + [Checkout now] (adds, then hands the line to the WooCommerce checkout), and a
sticky "Total · Qty · Checkout now" bar once the configurator scrolls away. Gallery gets a 3★ badge. Below: dark "ALPS" section
with the cam clip, red "Anti-snap, by design", six "As safe as houses" tiles from the Allegion renders, and a dark "Fitted by
locksmiths across the UK" CTA, then the existing inline film, description accordion, FAQ. Skipped: Ultion's keycode field
(our keyed-alike/extra-keys products carry the key number) and the Trustpilot slider (no verified source).

### Pass 10 — 10 Nov 2026, keys pages rebuilt to Ultion's Get Keys flow
Per `docs/keys-page-replication-spec.md`: pills, H1, live price, seven bullets; "How many keys do you need?" chips 1–6 with 3
preselected and the spare-key note; key-number field with format check and a "Where is my key number?" helper (key render,
three places to find it, phone fallback); "Get price and buy" reveals the total and, for the 3 Star keys (4266, which need the
key number as a WooCommerce field the Store API cannot set), a "Continue to secure checkout" link to the wdlocks.co.uk product
page carrying quantity and key number. The 1 Star keys (6062) add to the basket natively with Add to basket / Checkout now.
Below: dark "The real deal. Precision-cut keys from Watchdog" and cream "Key protection by key number". Warning badge under
the gallery: non-genuine keys damage the lock and invalidate the guarantee. Trustpilot slider skipped (no verified source).
Open: confirm the Watchdog key-number format with the client; extend the handoff plugin with `wd_keycode`.

### Pass 11 — 10 Nov 2026, basket & checkout rebuilt to Ultion's flow
Per `docs/basket-checkout-replication-spec.md`. Ultion: mini-cart drawer → /cart/ → one-page /checkout/ on the same domain.
Ours (payment stays on wdlocks.co.uk): drawer (now "Go to checkout" + "View basket") → `/basket` (line table, Don't forget
upsells, basket totals, Proceed to checkout) → `/checkout` review page (what happens next, payment marks, delivery options
with prices, order summary with qty/remove, total inc VAT, dispatch countdown and arrival date, "Continue to secure payment")
→ wdlocks.co.uk/checkout. Product "Checkout now" buttons now land on `/checkout` instead of handing off blind. Both pages
noindex. Single-line guard unchanged until the handoff plugin is installed. Still for the client: restyle the WordPress checkout
template (hide theme nav, trust strip, cards first) — not possible from this repo. Coupons: enter on the payment page (no proxy
endpoint yet).

### Pass 12 — 10 Nov 2026, remaining product pages on Ultion's standard template
Per `docs/other-products-replication-spec.md`: every product now carries certification pills, an H2 subtitle under the title
and benefit bullets (`PRODUCT_PILLS`, `PRODUCT_SUBTITLES`, `PRODUCT_BULLETS`). Rim cylinder, half cylinder, keyed-alike
service, lock lubricant and Bruno Teddy get three Ultion-style feature tiles (eyebrow · H3 · body · image, `PRODUCT_FEATURES`)
and a dark closer; the keyed-alike page also gets the "Front door + Back door + Side door + Garage = 1 key" graphic. Thumb turn
already shared the cylinder configurator and lock sections. FAQ accordions and the inline film stay where they were. Skipped:
Trustpilot bars and review sliders; Apple/Google Pay (payment is on wdlocks.co.uk).

### Pass 13 — 10 Nov 2026, "The very best protection for British homes" exploded-lock moment
Pritam asked for Ultion's exploded-lock section. No Watchdog exploded render exists, so `ExplodedLock` cuts the Watchdog
cylinder render into seven vertical slices that sit assembled and spring apart (with drift and tilt, cam slice fixed) once the
section is half in view, playing once; reduced motion shows the exploded state. Section restyled to Ultion's layout: dark
panel, three-line headline with red "very best", Learn more, engraved-marks row beneath. Replaces the turntable video in that
slot (the turntable still runs behind the hero and in the action bar). Replace with the real exploded render when Allegion
supplies it.

### Pass 14 — 10 Nov 2026, menus on Ultion's dark pattern
Per `docs/menus-replication-spec.md`: desktop mega-menu is now a dark panel under the black header with dark product cards
(photo at 20 % opacity / 30 % grayscale brightening to colour on hover, POPULAR pill, white title, muted one-liner, price,
filled red "Buy online" + outline red "Explore"), a red "More products" column and a dark accreditation strip. Mobile menu is a
full-screen black panel with the light logo, 2xl white top-level items, expanded groups listing products with red Explore /
Buy online links, a MOST VIEWED block, contact details and a sticky red guarantee button.

### Pass 15 — 10 Nov 2026, QA pass
Live crawl + browser checks at 1366 px and 375 px on every route: all routes 200, no console errors, no missing alt or
broken images, no horizontal overflow, JSON-LD valid, one visible `h1` per page, basket flow (add → drawer → /basket →
/checkout → remove) works end to end. Fixed: the 404 page now has its own title and `noindex`. Report:
[qa-report-2026-11-10.md](qa-report-2026-11-10.md).

### Pass 16 — 10 Nov 2026, Home Truths page
Per `docs/home-truths-replication-spec.md`: new `/home-truths` route in Ultion's order — dark banner ("The world we live in"
/ "Home **truths**", X-ray render), snap carousel of five truths with giant red figures (every figure from the ONS Crime
Survey *Nature of crime: burglary* tables, year ending March 2025, with the table cited under each slide), "How secure is
your area?" postcode crime checker (postcode POSTed to `/api/crime`, latest six months from data.police.uk, 1 or 3 miles
with automatic fall-back when an area is too dense, burglaries highlighted, month bars, top categories, OpenStreetMap
embed, Open Government Licence attribution), "Meet the people behind Watchdog" statement + three sourced fact tiles in
place of Ultion's founder quote and timeline, then the existing accreditations, guarantee and buy band. Nav/footer
"Reviews" (pointing at a removed section) → "Home truths"; homepage Home Truths "Learn more" → the page; sitemap entry;
CSP now allows OpenStreetMap frames and same-origin geolocation. Skipped: success stories (reviews source pending).

### Pass 17 — 10 Nov 2026, Guarantee page + real exploded lock
Per `docs/guarantee-replication-spec.md`: new `/guarantee` route on Ultion's `/guarantee-registration/` layout — dark
activation panel ("Activate your **protection**.", three red-tick benefits, key-tag render, activation card), then the
guarantee itself from clause 14 of wdlocks.co.uk/terms (four figures, nine conditions, link to the terms), "How to
claim" in three steps, "Keep it valid" (genuine keys → extra keys, Lution XM every 6 months → lubricant), key-copy
protection panel, six-question FAQ with FAQPage JSON-LD, accreditations and buy band. The activation card ships in
**handoff** mode (explains the three things needed, "Where is my key number?" and "About your data" modals, Activate
now → the WordPress form). A **proxy** mode is built (`/api/guarantee` → Elementor `elementor_pro_forms_send_form`,
post 5203 / form 73d0ba3); switched on the same evening after one approved test submission was accepted ("Your submission was successful"), so the whole registration now happens on our page. Every "Activate £5,000 guarantee"
button (header, mobile menu, hero card, homepage panel, Keys menu, footer) now goes to `/guarantee`; sitemap entry.
Client file `home-lock-exploded.mp4` (2 s exploded-view animation) replaces the CSS slice-explode in "The very best
protection for British homes": all-keyframe 720p encode, background lifted to white and multiply-blended on a light
panel (Ultion's is #f0f0f0), **scrubbed by scroll** so the cylinder flies apart as the section rises and reassembles on
the way back; reduced motion shows the exploded still. Noted for the client: clause 14.1.5 says the claim form is
"available here" but the terms page has no link.

### Pass 18 — 10 Nov 2026, Contact page
Per `docs/contact-replication-spec.md`: new `/contact` on Ultion's "Talk to an expert" layout — red "Here to help" pill,
H1, callback card (name, number, "When shall we call you?" windows computed from the clock, optional topic, Book my
call), "Give us a call" (sales line, freephone, emergency locksmiths 24 hours → wdlocksmiths.co.uk), "Send us an email"
with the socials, "Send us a message" form (wdlocks.co.uk's own form cannot submit: its Spectra script is not loaded),
"Visit the shop" with address and an OpenStreetMap embed, compact trust strip, buy band; Organization + ContactPoint
JSON-LD. Delivery: `/api/contact` emails both forms to sales@wdlocks.co.uk through Resend once `RESEND_API_KEY` is set
(README); until then the API answers 503 and the page opens the visitor's mail app with the request pre-filled.
Header, Keys menu and footer "Contact" now go to `/contact`. No opening hours shown (none published; client to confirm).

### Pass 19 — 10 Nov 2026, client feedback batch
From Pritam's review: **hero** now runs a 15 s silent cut of the inside-the-lock film (SnapStop → hardened steel drill
protection → pick protection → springs) behind the headline; **header is white** (warm-white navbar, red guarantee
button, light mega-menu cards and a light mobile menu; footer stays black); "Fitting the highest security protection"
section on **white**; **Home Truths** rebuilt on Ultion's `section-home-truths` pattern (dark panel, "Home truths",
giant sourced figure 63 % + "of burglaries happen while someone is at home", Learn more + "How secure is your home?" →
the crime checker); the red **buy band now sits above** Home Truths; **accreditations** are three large alternating
explainers using the client's own copy (Sold Secure Diamond "The toughest test ever", BSI Kitemark "British Standards",
Secured by Design); **footer** bottom bar has Facebook and Instagram icons; **configurator**: Key operated / Thumb turn
now switches in place (route change without scrolling, size carried over) and the primary button is **Buy now**, which
goes straight to secure payment on wdlocks.co.uk with that line (keyed-alike still goes via the basket review);
**contact page** reworked (three dark quick-action tiles, callback and message forms side by side, call/email cards with
icons, full-width shop card with address beside the map — the "Visit the shop" heading glitch is gone). Trade
application: plan written in `docs/trade-application-plan.md` (the WordPress page's body is a stray Bristol locksmith
article; the Elementor form is reusable with the guarantee-form pattern).

### Pass 20 — 10 Nov 2026, Trade page
Per `docs/trade-application-plan.md`: new `/trade` — dark hero ("Fit the lock you can stand behind.", X-ray render,
Apply + Call), four sourced reasons (one cylinder for every specifier; £5,000 guarantee the customer registers;
keyed-alike and keys cut to number; made by Brisant Secure, part of Allegion), three steps, the application section
(company, contact, trading address, postcode, phone, email, type of business, optional volume and website), six FAQs
with FAQPage JSON-LD, the accreditation explainers and an "Already a trade customer?" closer. The application form ships
in **handoff** mode (card → the WordPress form); the **proxy** (`/api/trade` → Elementor post 4783 / form `bc00e91`,
business type + volume + website folded into the Type of Business field) is built and waits for one approved test
submission, as with the guarantee form. Trust strip, Locks menu and footer "Trade application" now go to `/trade`;
sitemap entry. No pricing, credit or carriage terms are stated until the client confirms them.

### Pass 21 — 10 Nov 2026, own pages for every old-site click, hero carousel, Playwright suite
Clicks that left for wdlocks.co.uk, and what replaced them: footer "Terms & conditions" → `/terms` (WordPress page
`terms`, rendered through the sanitiser; clause 14 is the guarantee); checkout "privacy policy" → `/privacy` (WordPress
page `privacy-policy`); footer "Blog" → `/blog` + `/blog/[slug]` (the ten WordPress posts, featured images, Article
JSON-LD, sitemap); "Trade application" → `/trade` with the **on-page form switched on** (`/api/trade` → Elementor form
4783/bc00e91, not yet test-submitted); keys cards "Order with key number on wdlocks.co.uk" → our keys page; the
configurator's "Order extra keys" → our keys page; mobile-menu "Activate my guarantee" → `/guarantee`. What still goes
to wdlocks.co.uk by design: "Buy now" / "Continue to secure payment" (payment) and the 3 Star keys "Continue to secure
checkout" (the key-number product field the Store API cannot set; needs the mu-plugin). An e2e test now asserts no
other link on the main pages leaves the site. Hero: background is now a **carousel of four brand films** (inside-the-lock
cut, cylinder turntable, full inside film, key turntable), 12 s each with a crossfade, dots to pick one, paused off
screen. Announcement bar slimmed to Ultion's size with "Looking to buy extra keys? Click here · Order before 3pm for
same-day dispatch". Protection panel is Ultion's #f0f0f0 at 680 px. Lock switch keeps its screen position across the
route change (anchor restore). **Playwright**: `npm run test:e2e` runs 52 checks on desktop and Pixel 7 against
production (every route renders cleanly, header/menus, homepage structure, product switch and Buy now, guarantee and
trade forms, crime checker, contact, blog/terms/privacy, no stray links, 404, and the live basket flow in its own serial
project). Result: 51 passed, 1 flaky (basket drawer on desktop, passes on retry).

### Pass 22 — 10 Nov 2026, 2pm cut-off
Dispatch cut-off changed from 3pm to 2pm on the client's instruction (Jayesh, 10 Nov): announcement bar, product
pills and bullets, delivery panels, checkout review, FAQs, guarantee and trade copy, and the delivery-estimate logic
(`DISPATCH.cutoffHour` 14, Europe/London). Note: wdlocks.co.uk still says "cut-off time to 3pm" in its side cart; the
client should align the WordPress copy.

### Pass 23 — 10 Nov 2026, header back to black, translucent
Pritam liked the white header but asked for black with a little transparency: header is now near-black at 75 % with a
12 px backdrop blur, white links, red guarantee button; the mega-menu panel is near-black at 92 % with blur, its product
cards stay light (warm-white, photos in colour) and turn black with white text on hover, keeping the lift, image zoom
and the red Buy online / outline Explore buttons; the aside card does the same; the mobile menu is dark again. e2e
header test updated for the oklab colour string browsers now report.

### Pass 24 — 10 Nov 2026, Ultion-exact homepage blocks, white header with black dropdown, product pages
Measured Ultion again (10 Nov) and matched: **header** pure white, links black, and the dropdown **black** again
(#1b1a1c at 95 % with blur, dark cards whose photos brighten from 30 % to 90 % on hover, cream text, 0.28 s eased
open, 0.3–0.5 s hover transitions); **hero carousel** shows the two 5:4 films whole (object-contain) over a blurred
poster fill instead of cropping them; **products section** on white with Ultion's grey cards (#f0f0f0, 10 px radius,
large photo, 22 px title, blurb, red "Buy now" 48 px / 8 px radius), one card per row on phones; **protection** block
is Ultion's: 680 px #f0f0f0, exploded-lock film full-bleed behind, only the title (50 px / 600, red "very best") and a
52 px "Learn more" button; **Home Truths** is Ultion's block (#2a2a2a, 640 px, "Home truths" 23 px red, 64 % at 360 px
red, claim 56 px white beside it, "Learn more" → /home-truths; figure sourced to ONS CSEW year ending March 2020,
64.1 %) and sits **above** the red buy band as on Ultion. **Product pages** and the products index on white with the
grey gallery card, grey thumbnails and grey feature tiles. e2e updated (white header, truths block, order).

### Pass 25 — 10 Nov 2026, all-white canvas, video bar, switch, nav underline, centre-scrub
Client round: the **canvas is now white** (cream tokens retargeted: sections white, panels/cards Ultion grey #F0F0F0 /
#F5F5F5, neutral borders — one change in globals.css, every page follows); the **"See it in action" bar** shows the same
four films as the hero carousel (drill-protection cut, inside film, cylinder turntable, key turntable) while the hero's
"Watch full video" still opens the 40 s explainer; the **Internal control** switch keeps Key operated on the left and
Thumb turn on the right — only the radio state changes (it used to re-order so the selected option came first); the
**header hover** is a 2 px red underline growing from the left (the pill highlight was misaligned on the wrapped
two-line labels and became invisible on white), items no longer wrap; the **exploded lock** now finishes exploding
exactly when the Protection block is centred in the viewport, then holds (progress = section entering at the bottom
→ section centre at viewport centre).

### Pass 26 — 10 Nov 2026, two phone-layout bugs the new e2e check caught
Added an e2e assertion that the layout viewport equals the visual viewport on every route (Chrome silently zooms
a page out when something is wider than the phone, which the old overflow check could not see). It caught two: the
cylinder product page laid out at 512 px because its seven gallery thumbnails set the grid column's minimum width
(fixed with `min-w-0` on the column and the gallery), and the privacy page's three-column table widened phones to
450 px (prose tables now scroll horizontally; long words wrap anywhere). Also: the header guarantee button no longer
wraps onto two lines, and the nav underline sits just under the label.

### Pass 27 — 10 Nov 2026, exploded lock plays at the middle of the screen
Pritam asked for the "very best protection" film to run when the block is in the middle of the screen rather than
follow the scroll: the 2 s explosion now plays once when any part of the block overlaps the middle 20 % of the
viewport (IntersectionObserver with a −40 % / −40 % root margin), holds on the exploded frame, pauses on a hidden
tab, and resets when the block leaves so it plays again next time. Re-verified the two phone-layout fixes live.

### Pass 28 — 10 Nov 2026, exploded lock reassembles in reverse
The reset after the block leaves was an abrupt snap; the lock now closes back up with a reverse transition
(frames stepped backwards over ~1.1 s, eased, proportional to how far it had exploded; browsers cannot play video
in reverse natively, and the all-keyframe encode makes reverse seeking smooth). Re-entering while it is closing
resumes the explosion from where it is.

### Pass 29 — 11 Nov 2026, overnight: speed, Ultion font and nav, equal cards, on-site checkout
Pritam asked for an end-to-end test, Ultion's font and nav spacing, a fix for the slow first load and slow
add-to-basket, research on where media should live, an on-site Stripe checkout with the same options as
wdlocks.co.uk/checkout, and equal product cards. Five research agents ran in parallel (typography/nav measurement,
performance audit, media hosting, Stripe/live-checkout scan, card UI) and their reports are in docs/:
`ultion-typography-nav-spec.md`, `performance-audit-2026-11-11.md`, `media-hosting-research.md`,
`stripe-checkout-plan.md`, `ui-rendering-notes.md`.
- **Speed.** The audit measured the basket drawer appearing 2.3–2.8 s after a click because the UI waited for the
  Store API round trip (WordPress on shared hosting answers in ~1.05 s at best, ~2 s through the Vercel function).
  The drawer now opens in ~80 ms with a provisional line while the request completes (optimistic add with rollback),
  the session is warmed on idle/hover so the first add needs one upstream call, visitors without a basket skip the
  mount-time cart fetch entirely, a Store API hiccup during an ISR refresh no longer caches an empty grid (retry +
  last good catalogue), the hero film is 2.0 MB instead of 3.4 MB, the exploded clip loads only when near, phones
  and data-saver get posters instead of films, the layout's product payload is trimmed, media gets week-long cache
  headers, and `Server-Timing: upstream` on every cart response shows how much of a call was WordPress.
- **Typography.** Ultion sets everything in Sofia Pro (Adobe Fonts, paid, domain-locked). Outfit measured within 2 %
  of its x-height/cap-height/widths with the same letter shapes, so Outfit now replaces Inter and Playfair
  everywhere; headings track −0.035em like Ultion's. Nav links are 17 px/600 with 15 px padding and 10 px between
  items (Ultion: 18 px/700, same spacing), the header is 84 px on desktop and the guarantee CTA is Ultion's outline
  button.
- **Cards.** Titles, blurbs, prices and buttons sit on five shared subgrid rows, so every card in a row is identical
  (664 px at 1440) with reserved heights for browsers without subgrid; 3 × 3 grid, quieter hover, "Order keys".
- **Checkout.** The live wdlocks.co.uk checkout is the classic WooCommerce form with PayPal, PayPal card fields,
  Google Pay (via PayPal) and Trustly; the Stripe plugin is not installed and no standalone Stripe account is known,
  so a Stripe build needs the client's keys. Built anyway, fully env-gated: an Ultion-style one-page checkout
  (contact, UK address, live delivery rates and coupons from the Store API, order notes, Stripe Payment Element +
  Express Checkout for Apple/Google Pay, Klarna, Clearpay, PayPal), the WooCommerce order + PaymentIntent + webhook
  routes, and a return/thank-you page. Without keys the shop keeps the hand-off; the new page is at
  `/checkout?preview=1` (address, delivery and coupons work for real there).
- **Tests.** 52/52 e2e on production before and after; new checks for card alignment, the instant drawer, the
  Outfit header and the checkout preview.

### Pass 30 — 11 Nov 2026, hero films, 100 px header, accreditation marks, and an Ultion film removed
Pritam: the first hero film's blurred backdrop looked wrong and the 5:4 cuts looked cropped. The carousel is now three
16:9 films edge to edge (the inline explainer he asked for, the cylinder turntable, the full Watchdog film); the two
white-background explainer films are dimmed so the white headline stays readable. Header is 100 px with 17/18/20 px
links by width, logo and links on the left. The three "Tested, not claimed" marks are trimmed to their visible bounds
so each fills its circle like Secured by Design (the BSI mark's off-white box is keyed out). The "gap" in the
Protection panel was the small, bottom-aligned lock in a 680 px void; the film now fills the panel and the headline
is centred. **Enlarging it exposed that the "exploded lock" clip was Ultion's own film (engraved ULTION ★★★ PLUS)**:
removed from the repo and the asset register, replaced by the brand-free Watchdog ALPS cut-away (plays while the block
is centred, pauses off screen).

### Pass 31 — 11 Nov 2026, evening: Paramjit's WhatsApp batch and a header overflow
Paramjit (18:54–19:28): use the YouTube fitting guide https://youtu.be/rqd_6g9LcFI ("How to fit a door lock?", 2:18,
Watchdog Locksmiths channel) on the main page in place of a film that "is repeated twice", so customers see it is simple
to fit themselves; a bigger Sky Sports logo "as per this" photo (the photo arrived 12 Nov — Pass 32); and the red
straight-edge key tag render (Watchdog_Red_Straight_Edge(1).pdf) "as it's more realistic". Pritam: the burglar photo goes
behind the 64 % Home truths figure.
- **"See Watchdog in action."** The 15 s drill cut was a repeat of the inside-the-lock film; it is replaced by the fitting
  guide as an embedded YouTube player (privacy domain, muted autoplay, YouTube's own controls) that is mounted only while
  its slot is active on screen. Auto-advance now stops once the visitor picks a film, and playback only stops when the
  stage has fully left the screen (hysteresis), so a small scroll no longer restarts a film.
- **Key tag.** The PDF's 2700 × 1418 render was cut out of its white page (flood fill from the corners at tolerance 20,
  body eroded 5 px to drop the opaque shadow rim, punched hole made transparent) to `guarantee-keytag-red.png`
  (900 × 1321); the old yellow Brisant tag is gone from the Guarantee panel and the Home truths "Behind Watchdog" block.
  New file name because the image optimiser caches by URL.
- **Home truths.** The burglar photo (client, 11 Nov) sits behind the figure: right 55 % faded in from the left on
  desktop, full-bleed at 35 % on phones with a soft shadow under the headline.
- **Header overflow (Pritam, 21:05: "a horizontal bar appeared, basket isn't in the right place").** At 1680–1750 px
  the `ultra` step (20 px links, 20 px padding) and the "Basket" label appeared together and the header ran 42 px past the
  window, giving a horizontal scrollbar with the basket off screen. Links keep 20 px type with 16 px padding at `ultra`
  and the label stays icon-only from `xl`; no overflow at 360–1920 px on production.
- 52/52 page tests on production; local screenshots and a width sweep (360–1920) before the deploy.

### Pass 32 — 12 Nov 2026: the Sky Sports logo at the old site's size
Pritam forwarded Paramjit's reference (a phone screenshot of the "How we protect you" block on wdlocks.co.uk): "As seen
on" on its own line and the Sky Sports mark under it at about 70 % of the screen width, with "the logo size only" to
change.
- The 300 × 171 webp we had (`as-seen-on-sky-sports.png`) went soft at that size, so the old site's own 1400 × 800
  upload (`wp-content/uploads/2025/05/sky-sports.webp`) was trimmed of its transparent margins and saved as
  `sky-sports-logo.webp` (1000 × 214, 23 KB). New file name because the image optimiser caches by URL.
- `SkySports.tsx`: the inline "As seen on + 56/72 px logo" line is now a label line and a 70 %-width logo capped at
  440 px. Measured on production: 251 × 54 at 390 px (64 % of the screen, the reference is ~70 %), 440 × 94 at 1440 px.
  No horizontal overflow at either width.
- Still open from Paramjit's batch: nothing. Longer-standing asks (Stripe keys, photos, exploded render, host cache,
  Resend key, reviews source, extra-keys rule, Vercel Pro) unchanged.

### Pass 33 — 12 Nov 2026: payments rollout, stage 1 ready (Stripe test mode on a staging site)
Pritam has access to the client's Stripe account and asked to go step by step: "dummy transactions with dummy cards,
like a staging env" before anything real. Plan and runbook in `docs/stripe-checkout-plan.md` §5.
- **Staging site:** https://wdlocks-frontend-staging.vercel.app — its own Vercel project deployed from the new `staging`
  branch (worktree `../wdlocks-frontend-staging`), because preview deployments sit behind Vercel's login wall, which the
  client's phone and Stripe's webhook cannot pass. Same WooCommerce backend, `NEXT_PUBLIC_CHECKOUT_MODE=demo`, `noindex`
  + robots disallow (`IS_STAGING`). The demo 4242 checkout e2e passes there (53/53 with its page-test dependencies).
- **Sandbox stage in code:** Stripe test keys without a WooCommerce key now run the real Payment Element and real
  test-mode PaymentIntents against the pretend cookie order (`isStripeSandbox()` in intent/status/webhook); a "Test
  mode" banner shows whenever the publishable key is `pk_test_`. Stripe's Elements iframe now loads Outfit (was Inter).
- **`scripts/stripe-setup.mjs --target staging|production`:** validates key shapes and modes, calls Stripe to confirm
  the account, checks the WooCommerce REST key when present, creates/updates the webhook endpoint (writes `whsec_` to
  `.env.local`), pushes the variables to the right Vercel project. Keys are read from `.env.local` only.
- **Waiting on Pritam:** the test publishable + secret key pasted into `.env.local` (placeholders added). Then stage 1
  is one command plus a staging deploy. The WooCommerce REST key is stage 2; live keys are stage 3.
- Main's push now auto-deploys production through the Vercel Git integration (noticed: deployment `ra54fntm3` at
  00:22 came from the push, not the CLI), so a `git push origin main` is a production deploy.

### Pass 34 — 12 Nov 2026: stage 1 live on staging — real Stripe test-mode payments
Pritam asked for the test keys to be fetched from the client's Stripe dashboard. Via his signed-in Chrome: account menu
(top left) → "Switch to sandbox" → **Test mode**; the API keys page there already held a `pk_test_` publishable key and
a full-access `sk_test_` secret key (created 11 Nov). Both were copied with Stripe's own Copy button and pasted from the
clipboard straight into `.env.local` (never through chat); clipboard cleared afterwards.
- `node scripts/stripe-setup.mjs --target staging`: account confirmed (GB, Watchdog Locksmiths Ltd, charges enabled),
  test-mode webhook endpoint `we_1UamNZAi3njqKy9rouoMf5Co` created for
  `https://wdlocks-frontend-staging.vercel.app/api/stripe/webhook`, keys pushed to the staging project; deployed.
- **Verified on staging with `tests/e2e/basket-stripe.spec.ts`** (3/3, 58 s): 4242 → return page "Thank you, your
  order is confirmed", basket emptied; 4000 0000 0000 0002 → "declined" message, stays on /checkout, basket kept;
  4000 0025 0000 3155 → Stripe's 3-D Secure challenge completed → confirmed. Test skips itself on any target without
  the "Test mode" banner, so it can never drive live keys. The checkout page never reaches `networkidle` (Stripe.js
  keeps a socket open) and the card fields live in the iframe titled "Secure payment input frame".
- The payments show in the Stripe Dashboard (Test mode → Transactions) with `sandbox=true` metadata and a
  "not a real order" description; the live WooCommerce shop received nothing.
- Next: stage 2 needs a WooCommerce REST key (Read/Write) so test-card orders land in the WooCommerce admin; stage 3 is
  live keys on production (runbook in `docs/stripe-checkout-plan.md` §5).

### Pass 35 — 12 Nov 2026: stage 2 verified (test cards → real WooCommerce orders) and the carousel renamed
- **WooCommerce REST key.** Created in wp-admin via Pritam's signed-in Chrome (WooCommerce → Settings → Advanced →
  REST API → Add key): "Headless checkout (staging)", owner "Watchdog Locks Team" (#5), Read/Write. Validated by
  `scripts/stripe-setup.mjs --target staging` (orders endpoint readable), pushed to the staging project, deployed.
- **Verified on staging** (`tests/e2e/basket-stripe.spec.ts`, now accepting real `wc_order_` keys and order numbers):
  4242 → WooCommerce order created `pending` by `/api/checkout/intent`, flipped to `processing` by the webhook, "Thank
  you" page shows the real order number, basket emptied; 0002 → order stays `pending`, shopper sees "declined";
  3155 → 3-D Secure challenge → `processing`. Orders carry `created_via: headless`, `_headless_site: wdlocks-frontend`
  and the PaymentIntent id as `transaction_id`. Test orders 6205–6215 were cancelled through the REST API with a note
  ("TEST ORDER … safe to delete"); customer order 6203 (created via the old checkout) was not touched.
- Test flakiness fixed: the basket-empty check waits for the Store API (30 s), and the 3-D Secure click now repeats
  until the return page appears (the first click can land while Stripe's modal is still animating).
- **Carousel heading** on the homepage is now "How to install Watchdog" (client, 12 Nov; was "See Watchdog in action"),
  live on production through the main push.
- Stage 3 (go-live) remains: live keys on production, Apple Pay / Google Pay domain registration, remove
  `NEXT_PUBLIC_CHECKOUT_MODE=demo` from production, decide the e-mail receipts (Stripe receipt vs WooCommerce's).

### Pass 35 — 12 Nov 2026: stage 2 verified — test-card orders land in WooCommerce
Pritam signed in to wp-admin in his Chrome; the REST API key "Headless checkout (staging)" (owner Watchdog Locks Team
#5, Read/Write) was created on WooCommerce → Settings → Advanced → REST API and written to `.env.local`;
`stripe-setup.mjs --target staging` confirmed WooCommerce accepts it and pushed `WC_CONSUMER_KEY/SECRET` to the staging
project; deployed.
- **Verified on staging (`basket-stripe.spec.ts`, 3/3, 1.6 min):** 4242 → WooCommerce order created `created_via:
  headless`, marked **processing / paid** by the webhook with the note "Stripe payment succeeded: pi_… via card (visa
  •••• 4242)" and the intent id as `transaction_id`; declined 0002 → order stays **pending**, shopper sees the
  decline; 3155 → 3-D Secure challenge → processing / paid. Orders #6205–#6207 and the reruns' orders were then
  cancelled through the REST API with a note explaining they were test orders (the admin "New order" emails for them
  were real — WooCommerce sent them as for any order; the shopper's "Processing order" email to test@example.com
  bounced, as expected for a reserved domain).
- Fixes along the way: the e2e now accepts real order keys (`wc_order_…`, numbers like #6205) and runs `test.slow()`
  because REST order creation on the shared host takes 10–20 s per step; the webhook note names the method actually
  used (brand + last4) rather than every type the intent allowed.
- Next: stage 3 = live keys on production (`stripe-setup.mjs --target production`), Apple Pay / Google Pay domain
  registration, remove `NEXT_PUBLIC_CHECKOUT_MODE` from production; and tell Paramjit/Vijay to ignore the cancelled
  test orders in the admin.

### Pass 36 — 12 Nov 2026: testing only — staging is the client's playground, no live Stripe
Pritam: "prepare it for testing only and not live customer facing Stripe payment gateway". So:
- Staging back to stage 1: `WC_CONSUMER_KEY/SECRET` removed from the staging project and redeployed; test purchases
  create pretend orders (`wc_order_demo…`, #9xxxxx) and real test-mode PaymentIntents, nothing in WooCommerce. Verified
  with the three card tests (one run hit a momentary "store temporarily unavailable" from the WordPress Store API; the
  4242 case passed on rerun).
- Staging domain registered under Payment method domains (test mode): Apple Pay, Google Pay, Link active, so the
  Express Checkout buttons appear on the test site.
- Tester guide for Paramjit (plain English: link, the three cards, what to look at, where payments show in the Stripe
  dashboard, what it is not): https://claude.ai/artifact/9FJYntpUtWQcvQtunFi9m2.
- Production untouched: demo provider, no Stripe keys. A `vercel deploy` meant for staging landed on the main project
  once because the shell's working directory had reset; same commit and variables, so no change, but every staging
  deploy now passes `--cwd ../wdlocks-frontend-staging` explicitly.
- Stage 3 (live keys) is deliberately not prepared.

### Pass 37 — 12 Nov 2026: bigger accreditation marks, new rim cylinder render, keyed-alike film
Three client asks in one go, each verified on production before the push:
- **"Tested, not claimed" — "the images should be big."** Ultion's 249 × 207 box left the tall Sold Secure mark at 85 px
  wide and the Kitemark at 117 px on desktop. The three marks now share one height (200 px on phones, 260 px from lg)
  and scale to it: Sold Secure 246 × 260, Kitemark 260 × 260, Secured by Design 357 × 260 (190/200/327 × 200 on a
  390 px phone). Secured by Design is the old site's own 1259 px upload, trimmed to 1240 × 760; Sold Secure (218 px)
  and the Kitemark (300 px) have no larger source on wdlocks.co.uk and the official artwork is only issued to
  licensees, so those two are soft on 2× screens until the client supplies originals.
- **Rim cylinder product photo.** Pritam's 1254 px brass render (engraved WATCHDOG) replaces the 4× Lanczos upscale of
  the 218 px shop photo; served as a 63 KB webp, original kept in client-assets.
- **"One key for all locks" plays the client's film** "How to fit a door lock?" (youtu.be/rqd_6g9LcFI): a new
  `YouTubeEmbed` (privacy-enhanced domain, player loaded only once in view, muted autoplay, reduced motion = no
  autoplay) now serves both this panel and the Sky Sports block; the dimple-key chapter loop stays on the key pages.

### Pass 38 — 12 Nov 2026: rim cylinder to 7th place
Pritam: "move this product Rim Cylinder to 7th place and replace 3rd place with 7th". The shop order is `CATALOGUE`
in constants.ts (the grid on /products and the homepage, the footer product list and the mobile menu all follow it),
so the rim cylinder and keyed-alike entries swapped places: 1 cylinder · 2 thumb turn · 3 keyed-alike · 4 half
cylinder · 5 3 Star keys · 6 1 Star keys · 7 rim cylinder · 8 lubricant · 9 Bruno Teddy. Verified on production;
desktop + mobile e2e green (52).

### Pass 39 — 12 Nov 2026: "Tested, not claimed" spacing and responsiveness
Pritam: "increase the spacing and make it responsive". Three columns from 640 px had squashed every mark to 176 px and
wrapped the titles. Now the three stack until lg (one centred column, 420 px max), then sit three across with 72–96 px
between them; each mark fills a 6:5 box that follows its column (400 px max), via `fill` + object-contain. A first cut
with `width/height` + `w-auto` rendered the marks at 136 px: with a `w` srcset the browser sizes an auto-width img from
the candidate's density (218 px ÷ 640w/400px), so the box must size the image. Spacing: 40 px mark → title, 24 px title
→ text, 80 px between stacked items, section 64/80/96 px. Measured on production: Sold Secure 213 × 224 on a 390 px
phone, 269 × 284 at 1440; Secured by Design 351 and 341 px wide.

### Pass 40 — 12 Nov 2026: payment tabs in each provider's own colours; PayPal and Google Pay on in Stripe
Pritam: "At payment gateway can we keep the colours of each payment gateway? to look authentic?"
- Demo provider (`DemoPayment.tsx`, the live site's pretend checkout): every tab now carries the provider's mark in its
  brand colours like Stripe's Payment Element tabs: generic card icon with Visa / Mastercard / Amex marks under it,
  black Apple Pay and Google Pay marks, PayPal blue monogram, Klarna pink badge. The pay button follows the method:
  black "Pay with  Pay" / "Pay with G Pay", PayPal gold with the blue wordmark, Klarna pink, our red for cards. Marks
  are the CC0 Simple Icons glyphs in `src/components/checkout/PaymentMarks.tsx` (Mastercard drawn by hand); the wide
  wordmarks use a cropped viewBox so `h-* w-auto` gives them real width.
- Stripe test mode: PayPal and Google Pay switched on in the account's default payment method configuration through
  the API (Pritam's go-ahead); the staging Payment Element now shows Card, PayPal, Klarna, Revolut Pay, Amazon Pay
  tabs plus Link. Noted in stripe-checkout-plan.md §5.
- Checked locally on a demo-mode dev server (`.claude/launch.json` → `dev-demo`, Stripe key blanked, port 3001) at
  1280 px and 390 px, then on production after the push.

### Pass 40 — 12 Nov 2026: grid "Buy now" opens the product page; keyed-alike to 2nd place
- Pritam (screenshot of the size-picker modal): "instead of showing this modal please navigate to product details page
  directly". On the product grid, "Buy now" on a variable product (3 Star Cylinder, Thumb Turn, Rim Cylinder) is now a
  link to the product page, where the size/finish is chosen with the sizing guide; simple products still add straight
  to the basket and open the drawer. The grid no longer mounts `SizePicker` (the component stays for the product page).
- "Product listing: replace this with the 2nd place — Keyed-Alike Service": the catalogue order is now 1 cylinder ·
  2 keyed-alike · 3 thumb turn · 4 half cylinder · 5 3 Star keys · 6 1 Star keys · 7 rim cylinder · 8 lubricant ·
  9 Bruno Teddy.
- Verified on production; desktop + mobile + basket e2e green (one demo-checkout run timed out on a slow Store API add
  and passed on rerun).
- Pritam asked why the basket says "Our checkout currently accepts one product line at a time". That is the
  WooCommerce hand-off rule (`canCheckout` in src/lib/checkout.ts): without the `wd-cart-handoff.php` mu-plugin the
  native `?add-to-cart=` URL carries one line. Production runs the on-site demo checkout, which takes any number of
  lines, yet the basket and drawer still apply the hand-off gate — a leftover to fix (gate only in handoff mode).

### Pass 41 — 12 Nov 2026: the one-product-line limit only applies when handing off
Pritam: "Yes, remove it". `canCheckout` now applies the single-line rule only when the basket is really handed to
wdlocks.co.uk: by default when `CHECKOUT_MODE === 'handoff'` (and the mu-plugin is not installed), and always at the two
real hand-off points (`CheckoutReview`, the checkout page's "Continue to secure payment"), which pass `handoff: true`.
Production (demo checkout) verified with a two-line basket: no message, Proceed enabled, checkout shows both lines.
The demo-checkout e2e now waits 3 s before checking the emptied basket, as the Stripe spec does (the return page fires
the clear without awaiting it; it failed three times in a row on a slow Store API). Noted for later: the basket page
still says "Payment is taken securely on wdlocks.co.uk" under Proceed in demo mode.

### Pass 42 — 12 Nov 2026: Key operated ↔ Thumb turn switch no longer flickers or resets the scroll
Pritam: "Radio button switch issue … screen flickers, scrolled (up or below) window resets" on
/products/3-star-alps-cylinder-door-lock?size=35-35. The switch is a route change to the sibling product. Two causes,
both measured on production with a scroll/mutation probe:
- the route's `loading.tsx` skeleton flashed while the sibling page loaded, and the page shrank to it for a moment →
  `VariationSelector` now prefetches the sibling page (with the chosen size in the href) on mount and whenever the size
  changes, so the switch commits at once (0 skeleton mutations after; 1 before);
- the anchor-restore loop that keeps the switch under the cursor re-corrected at 60 ms … 3.2 s, undoing any scroll the
  shopper made in between (probe: a 400 px scroll 1.2 s after the switch was reverted at 2.2 s) → it now corrects at
  60/200/500 ms only and stops on the first wheel/touch/key/pointer event (the scroll now sticks).
A residual 200 px "wobble" in the probe turned out to be Playwright scrolling the button back into view (smoothly, via
html { scroll-behavior: smooth }) before clicking; a coordinate click shows no movement on a phone and one 17 px
correction on desktop. The lock-switch e2e matches the new h1 by name (old and new page overlap for <100 ms during the
commit) and waits 1.5 s instead of 2.5 s.

### Pass 43 — 12 Nov 2026: carousel removed, "How to install Watchdog" rebuilt, order notes always on
Pritam, three asks:
1. **"How to install Watchdog" carousel removed with its films** — `VideoBar` and the `VIDEO_BAR` list are gone,
   `fitting-poster.jpg` deleted. The inside film, turntable and key turntable stay where other blocks use them (hero
   backdrop, Inside the lock, the key product pages).
2. **"One key for all locks" kept, renamed "How to install Watchdog"** and rebuilt as `InstallSection`: eyebrow
   "Fitting guide · 2 min 18 s", heading, three numbered steps (measure to the face of the furniture / 5 mm steps,
   swap on the single fixing screw, test and register the guarantee), "Shop cylinders" + "Sizing guide" CTAs; the
   client's "How to fit a door lock?" film on the right with a caption and the phone number. Step copy comes from the
   film's description and standard euro-cylinder fitting — for the client to check.
3. **Order notes at payment** — the field existed but sat behind an "Add a delivery note" link in the Delivery step;
   it is now always shown as "Order notes (optional)". It was already sent as `customer_note` and written to the
   WooCommerce order (create and update); the demo order now keeps it too (`DemoOrder.customerNote`). Verified on
   production: the intent request carried the note on a demo payment.
Desktop + mobile e2e green (52).

## 9. Independent review

A second agent re-crawled both sites (≈45 Ultion pages, 9 WD pages, both Store APIs, Ultion's theme CSS/JS, GTM container) without a browser and cross-checked sections 1–7. Full review: [competitor-study-review.md](competitor-study-review.md).

- **Incorrect (fixed above):** the configurator's AJAX action name; "Trustpilot widgets" (static imagery and hard-coded quotes only); the Ultion hero/landing headlines are `<h2>`s with no `<h1>`; Ultion has no trade page (the installer link is off-site).
- **Nuance applied:** mega-menu opens instantly (no fade); button hover colours; the delivery marquee is server-computed via `delivery_date_notice`; the mobile drawer CTA is flex-aligned rather than sticky; the mini-cart lubricant upsell is a hidden product and WooCommerce redirects to `/cart/` after a normal add; WD's side-cart notice reads "Cut-off time to 3pm"; WD homepage has 36 stylesheets + 48 scripts.
- **Unverifiable statically (browser-only, observed by me):** the Welcome modal, the checkout contents (DPD £7.95, "Delivers Wed 11th November"), the £63 configurator price, request counts, the chat-tab overlap, WD's computed palette and shipping rates.
- **Missing coverage added to the backlog:** `/ultion-alps/` naming collision, `/home-truths/` crime checker, keyed-alike comparison table, guarantee registration form flows, contact page hours + callback, keycode business rules, hidden upsell product, price comparison, Yoast JSON-LD, Allegion parent brand, dual phone numbers, shipping zones.

## 10. Appendix — crawler findings (site map, catalogue, tech, SEO)
_Verbatim report of the crawler agent (curl + Store API, read-only, 2026-11-10)._


Crawled 2026-11-10 with curl (desktop Chrome UA) + python3 parsing only. Read-only: no forms submitted, nothing added to cart, no accounts. Raw HTML saved under `scratchpad/ultion/raw/`; homepage at `scratchpad/ultion/home.html` (273,446 B); Store API dump at `scratchpad/ultion/products.json` (908,882 B, 90 products).

Anything marked **(unverified)** could not be confirmed from static HTML/API.

---

### 1. SITE MAP

**robots.txt** (402 B): disallows `/wp-content/uploads/wc-logs/`, `woocommerce_transient_files/`, `woocommerce_uploads/`, `/wp/wp-admin/` (allows `admin-ajax.php`); Yoast block points to `Sitemap: https://www.ultion-lock.co.uk/sitemap_index.xml`.

`/sitemap.xml` and `/wp-sitemap.xml` both 301 → `/sitemap_index.xml` (Yoast, 1,196 B) with 7 child sitemaps:

| Sitemap | URLs | lastmod | Notes |
|---|---|---|---|
| post-sitemap.xml | 36 | 2026-10-09 | 35 blog posts + `/news-blog/` |
| page-sitemap.xml | 114 | 2026-09-21 | includes many funnel/thank-you/landing pages |
| product-sitemap.xml | 51 | 2026-11-09 | 50 products + `/shop/` |
| category-sitemap.xml | 4 | 2026-10-09 | blog categories |
| product_cat-sitemap.xml | 33 | 2026-11-09 | product categories (many are internal/staging) |
| product_tag-sitemap.xml | 1 | 2023-03-23 | `/product-tag/ultion-smart/` |
| product_shipping_class-sitemap.xml | 2 | 2026-11-09 | `?taxonomy=product_shipping_class&term=paid` / `standard` (leaky) |
| **Total** | **241** | | |

**Product count:** 50 products in sitemap; **90 products** returned by the Store API (`X-WP-Total: 90`, 1 page). 48 of the 90 are in the sitemap, **42 are hidden** (catalog-hidden backing SKUs for the configurators: `Ultion locks`, `Ultion locks to code`, `Ultion thumbturn`, `Keys`, `Ultion Nuki Bundles`, `White label` keys etc.).

**Redirect quirks:** `/shop/`, `/product-category/locks/` and `/secure-locks-guarantee/` all 200 → **redirect to the homepage** (no shop grid / no category archive pages are exposed). `/checkout/` redirects to `/cart/` when the cart is empty. `/get-locks/` → `/get-locks/product/`, `/get-keys/` → `/get-keys/product/`.

#### 1.1 Pages (114) grouped
- **Core:** `/`, `/ultion-locks/`, `/security-handle/` (+`/security-handle-2/`, `/security-handle/ar/`, `/ar/view/`, `/ar-plus/`), `/ultion-accessories/`, `/ultion-sweet/`, `/ultion-bolt/`, `/ultion-padlock/`, `/ultion-keytag/` (+`-3`, `/fit-video/`), `/ultion-nuki/`, `/ultion-nuki-2025/`, `/ultion-alps/`, `/keyed-alike/`, `/home-truths/` (+`/hometruths/`), `/news-blog/`, `/contact/` (+`/thank-you/`), `/find-my-ultion/`, `/gate-sign/`, `/door-stop/` (+4 sub-states), `/customer-banners/`, `/brisant/`
- **Commerce funnels:** `/get-locks/product/`, `/get-locks/key-centres/thank-you/`, `/get-keys/product/`, `/get-keys/order-keys-3/`, `/get-keys/order-keys-4/`, `/get-keys/ultion-keys-2/`…`-4/`, `/get-keys/order-lock/`, `/get-keys/order-lubricant/`, `/get-keys/get-keys-delivered/` (+`/thank-you/`), `/get-keys/key-centres/thank-you/`, `/cart/`, `/checkout/`, `/woo_barclaycardcw/`, `/approved/`, `/rejected/`
- **Guarantee / Key Control:** `/guarantee-registration/`, `/guarantee-registration-2/`, `/landing/registration/` (+`/installer-code/`, `/confirm-keycodes/`, `/re-enter-keycodes/`, `-keys` variants, `/callback/thank-you/`), `/customer-page/guarantee-registration/...`, `/customersupport/guarantee-registration/...` (+`/call-back/`), `/key-control-received/`, `/kcverified/`, `/keycard-activate-5k/`, `/keycard-activate-2k/`, `/ultion-sweet-guarantee-registration/` (+`/thank-you/`)
- **Nuki support:** `/ultion-nuki/fitting/` (`top-fix`, `low-fix`, `escutcheon`, each `-with-bolt`), `/ultion-nuki-2025/fitting/{escutcheon,top-fix,low-fix}/`, `/ultion-nuki/{alexa,google,homekit}/`, `/ultion-nuki/ptsi-compliance-statements/`, `/ultion-nuki-questions/`, `/ultion-nuki-pro-questions/`, `/ultion-nuki-plus-questions/`, `/ultion-nuki-combined-questions/`, `/ultion-nuki-go-questions/`, `/ultion-nuki-2025-questions/`, `/ultion-nuki-classification/`, `/ultion-nuki-with-transmitter/`, `/ultion-nuki-2025-with-ultion-bolt-transmitter/`, `/ultion-handle-questions/`
- **Legal:** `/terms/`, `/webuse/`, `/privacy/`, `/cookies/`

#### 1.2 Products in sitemap (50)
keyring, lock-lube, ultion-gate-sign, nuki-key-fob, ultion-nuki-fob-bundle, nuki-bridge, ultion-nuki-transmitter, ultion-nuki-bundle-{1,2,3}-transmitter, ultion-nuki-bundle-{1,2,3}, ultion-nuki-plus, ultion-nuki-plus-bundle-{1,2,3}-transmitter, ultion-nuki-plus-bundle-{1,2,3}, ultion-nuki-plus-transmitter, 2-star-plus-handle, 2-star-handle, ultion-sweet-blanking-plate, nuki-external-handle, ultion-sweet-handle, ultion-keycap-st, ultion-keytag, nuki-key-pad, ultion-nuki-door-sensor, ultion-keylight-st, ultion-lock-lubricant, ultion-sweet-escutcheon, ultion-sweet-letterplate, ultion-sweet-numerals, ultion-sweet-knocker, nuki-rechargeable-battery-2-2, ultion-nuki-2025-bolt, ultion-nuki-go-with-ultion-bolt-transmitter, ultion-nuki-go-bolt, keycap, ultion-keylight, padlocks, ultion-sweet-patio-handle, door-handle-dda-compliant, ultion-security-handle, nuki-key-pad-fingerprint, ultion-nuki-go, ultion-nuki-2025, ultion-nuki-go-postpay (all under `/product/{slug}/`).

#### 1.3 Product categories (33, all top-level, from Store API `products/categories`)
1 Star Lock (2), 3 Star Lock (2), All (31), Bundles (3), Gate Sign (1), Handles (1), KeyCap (2), KeyCap ST (1), KeyLight (1), KeyLightST (1), KeyRing (1), KeyTag (1), Keys (3), Lock Lubricant (2), Locks (6), Nuki Bolt staging (6), Nuki Bolt-Postpay (2), Nuki-Postpay (2), Padlock (1), Security Handle (3), UNU (17), UNU accessories (6), Ultion Nuki (10), Ultion Nuki – Bolt (2), Ultion Nuki 2025 (2), Ultion Nuki Door Sensor (1), Ultion Nuki Go (4), Ultion Nuki Plus (4), Ultion Nuki Plus – Bolt (4), Ultion SMART (2), Ultion Smart Complete (1), Ultion Sweet (7), White label (1).
→ Categories are an **internal/operational taxonomy** ("staging", "Postpay", "White label", "UNU"), not a customer-facing IA. Category archive URLs redirect home.

#### 1.4 Blog (35 posts under `/blog/{slug}/`, categories: blog, burglary, crime, ultion)
Recent: anti-snap-locks-explained (2026-10-09), ultions-guide-to-improving-home-security (Peter Bleksley), is-your-padlock-actually-secure, how-to-replace-a-cylinder-door-lock, 6-ways-a-smart-lock-can-make-your-life-easier, ultion-vs-standard-euro-cylinder-locks-side-by-side-comparison, burglars-dont-pick-locks, blowtorch-burglaries-on-the-rise, the-all-new-ultion-nuki-2025, ultion-nuki-awarded-bsi-kitemark-for-internet-of-things, why-8000-people-rave-about-ultion-locks, how-does-ultion-bolt-work, 2023-burglary-statistics…, etc.

---

### 2. NAVIGATION STRUCTURE (from home.html `<header class="main-header" id="site-header">`, 24,192 B)

**Header layout (left→right):** logo (`logo.svg`, 293×40) · primary menu `<ul id="site_primary_menu" class="menu">` · `Activate guarantee` button (`.header-button` → `/guarantee-registration/`) · WooCommerce Blocks **mini-cart drawer** (`wc-block-mini-cart`, bag icon, label "Basket") · mobile hamburger `.mobile-nav-toggle`.

**Sticky utility bar above header** (`section.sticky-bar-container > .bar-extra-keys.sticky`): "Looking to buy extra keys? Click here" (page-specific: on `/ultion-locks/` it reads "Looking to buy extra locks? Click here").

#### 2.1 Primary menu (5 items; 3 are mega-menus `div.sub-menu.products-menu-updated`)
1. **Get Keys** → `/get-keys/product/` (plain link, first position)
2. **Locks** → `/ultion-locks/` — mega panel:
   - Product cards (`.product.medium`, tag `Popular`): **Ultion 3 Star PLUS Lock** "Our flagship high-security lock for homeowners." [Buy Online → `/get-locks/product/`] [Explore → `/ultion-locks/`] · **Ultion Nuki** "Simply our best smart-lock ever." [Buy Online → `/product/ultion-nuki-2025/`] [Explore → `/ultion-nuki-2025/`] · **Ultion Nuki Go** "Your flexible entry into the world of smart locks." [Buy Online → `/product/ultion-nuki-go/`] [Explore → `/ultion-nuki/`]
   - "More Products" column: Ultion Padlock (`/ultion-padlock/`), Ultion Bolt (`/ultion-bolt/`)
   - Trustpilot block: logo + 4.5-star SVG + "12500+ reviews"
3. **Handles** → `/security-handle/` — mega panel: **Ultion 2 Star** "Our high security handle." [Buy Online → `/product/ultion-security-handle/?attribute_model=Ultion+2+Star+Security+Handle&attribute_fixing-position=Above+Handle&attribute_handle-type=Lever&attribute_colour=White`] · **Ultion 2 Star PLUS** (Popular) "Our most secure handle ever." [Buy Online → same product, pre-selected PLUS] · **Ultion Long Lever** "With full DDA-compliance." [→ `/product/door-handle-dda-compliant/`] · **Patio Handle** "The suited sliding patio door handle." [→ `/product/ultion-sweet-patio-handle/`]; More Products: Security Handles, Blanking Plates, Ultion Nuki 2025, Ultion Nuki Go
4. **Accessories** → `/ultion-accessories/` — mega panel: **KeyTag™** (Popular) "Never lose your keys again." [Buy → `/product/ultion-keytag/`] [Explore → `/ultion-keytag/`] · **KeyCap™** (Popular) "Your Ultion key's best friend." [→ `/product/keycap/`] · **KeyLight™** "A built in torch for your KeyCap." [→ `/product/ultion-keylight/`] · **Lock Lubricant** (Popular) "Keeping your locks locked." [→ `/product/ultion-lock-lubricant/`] · **Door Accessories** "Our most stylish range yet." [Explore → `/ultion-sweet/`]
5. **Talk to us** → `/contact/`

Mega-menu card pattern: image (`.background` with brightness variants `brighten`/`brightest`), `.popular-tag` ("Popular" / "New for 2025"), `h3` title, one-line `p`, two buttons (`.primary-menu-button` "Buy Online" + `.secondary-menu-button` "Explore"). Deep links **pre-select variation attributes via query string**.

#### 2.2 Mobile menu (`nav.mobile-navigation > ul#site_mobile_menu`)
Keys · Locks (Our Locks + 5 cards) · Handles (6 cards) · Accessories (5 cards) · Home Truths · Contact · **"Most Viewed"**: Get More Keys, Activate My Guarantee, Ultion Nuki Go, Ultion 3 PLUS Lock, Buy Lock Lubricant · Activate Guarantee button.

#### 2.3 Mini-cart drawer content (server-rendered)
Title "Basket" + item counter · products table · **"Don't Forget" upsell**: "Stop key jamming with Ultion Lock Lubricant — Apply every 6 months to maintain guarantees — £12.95 — [Quick Add]" (`/?add-to-cart=278177&quantity=1`) · "View Basket" + Checkout buttons · empty state "Your cart is currently empty!".

#### 2.4 Footer (6 `ul.column-menu` columns + bottom bar)
| Popular | Locks | Handles | Accessories | Furniture | Support |
|---|---|---|---|---|---|
| Get Ultion Keys · Activate Guarantee | Ultion 3* PLUS Lock (→ `/get-locks/product/`) · Ultion Nuki Go · Ultion Padlock · Ultion Bolt | Ultion 2 Star Handle · Ultion 2 Star PLUS Handle · Ultion Long Lever · Ultion Patio Handle · Blanking Plates | Ultion KeyTag · Ultion KeyLight · Ultion KeyCap · Ultion Gate Sign · Lock Lubricant | Ultion Letterplate · Ultion Knocker · Ultion Handle · Ultion Numerals · Ultion Escutcheons | Contact Us · The Blog · PTSI Compliance Statements |

Bottom: tagline **"The home of home security."** · "Call us on 0115 784 3162" (`tel:`) · Activate guarantee button · Trustpilot 12500+ reviews · address "2-3 Staincliffe Mill Yard, Halifax Road, Dewsbury, WF13 4AP" · socials (facebook.com/ultionlock, instagram.com/ultionandsweet, twitter.com/UltionLock, linkedin.com/company/4793476) · privacy menu `#menu-privacy-menu` (Terms, Terms of web use, Privacy, Cookies) · "© 2026, Brisant Secure Ltd (trading as Ultion). Company Number: 07880349" · "Media enquiries - ultion@littleredpr.co.uk" · **Allegion** logo linking to allegion.com (parent company).

**Customer-facing product grouping used in nav:** Locks (3* PLUS cylinder, Nuki smart locks, Padlock, Bolt multipoint) · Handles (2*, 2* PLUS, DDA lever, Patio, Blanking plates) · Accessories (KeyTag, KeyCap, KeyLight, Lubricant, Gate Sign) · Door furniture "Ultion Sweet" · Keys (own top-level entry point).

---

### 3. PRODUCT CATALOGUE

#### 3.1 Store API
`GET /wp-json/wc/store/v1/products?per_page=100` → **200, 90 products, 908,882 B** (`X-WP-Total: 90`, `X-WP-TotalPages: 1`; page 2 returns `[]`). `/products/categories?per_page=100` → 33 categories (6,650 B). `/products/attributes` → `[]` (all attributes are **custom per-product**, no global attribute taxonomies). `/wp-json/wc/store/v1/cart` → 200 empty cart (1,073 B). `/wp-json/` root exposes 1,081 routes; site name "Ultion Lock", tagline "New 3 Star Plus Protection".

**Type mix:** 63 variable · 16 simple · 11 bundle (WooCommerce Product Bundles). All 90 `is_purchasable: true`; all in stock except `Ultion SMART and Wireless Keypad` (bundle, £0, out of stock). **Every product has `average_rating: 0`, `review_count: 0`** → native Woo reviews are not used (Trustpilot quotes are hard-coded in templates). `brands: []` everywhere.

**Biggest variable products (the cylinder SKUs behind the configurator):** `Ultion locks` (id 123069, **221 variations**, Size[103 terms like `35int/35ext`], Colour[Dual/Chrome/Brass]), `Ultion locks to code` (123425, 209 var.), `Ultion thumbturn` (123780, 155 var.), `Ultion thumbturn to code` (124286, 157 var.), `3 Star Lock` (251274, 131 var., Size[87 terms like `35/35`]), `3 Star Lock to Code` (251276, 131), `1 Star Plus Lock` (250816, 107), `1 Star Plus Lock to Code` (250818, 107), `Ultion SMART` (75169, 163 var.).

#### 3.2 Full product table (sorted by id; price = Store API incl. VAT; `vars` = variation count; `imgs` = image count; `SM` = in product sitemap)

| id | name | slug | type | price | vars | attributes (name[n terms]: sample) | categories | imgs | stock | SM |
|---|---|---|---|---|---|---|---|---|---|---|
| 1550 | Ultion Nuki Bundles | `/ultion-nuki-bundles-2/` | variable | £299.00–£425.00 | 30 | Cylinder Size[10]: No Cylinder, 30, 35, 40…; Bundle[3]: Bundle 1, Bundle 2, Bundle 3 | nuki-postpay, un | 0 | in | N |
| 8284 | Ultion Padlocks | `/padlocks/` | variable | £54.90–£75.90 | 5 | Body and shackle[6]: 61mm 1inch shackle, 61mm 2inch shackle, 61mm 3inch shackle, 54mm 1inch shackle… | padlock | 9 | in | Y |
| 8304 | Lution XM Lock Lubricant | `/lock-lube/` | variable | £12.95–£27.95 | 3 | Pack Size[3]: 1, 2, 3 | lock-lubricant | 1 | in | Y |
| 8331 | Ultion Keycap | `/keycap/` | variable | £9.95 | 13 | First digit of the key code[2]: A, U, X, Y or Z, C; Colour[7]: Black, Green, Orange, Red… | keycap | 1 | in | Y |
| 8369 | Keys | `/ultion-key/` | variable | £5.99–£29.00 | 37 | Colour[37]: Night Bright yellow with black insert, Night Bright pink with black insert, Black body with strawberry insert, Black body with black insert… | keys | 0 | in | N |
| 37381 | Ultion KeyLight | `/ultion-keylight/` | variable | £32.00 | 11 | First Digit of the Keycode[2]: A, U, X, Y or Z, C; Colour[7]: Black, Green, Orange, Pink… | keylight | 1 | in | Y |
| 43056 | Wireless Keypad | `/wireless-keypad/` | simple | £119.00 | 0 |  | — | 1 | in | N |
| 75169 | Ultion SMART | `/ultion-smart-options/` | variable | £229.00–£259.00 | 163 | Operate only from HomeKit smart home system?[4]: No, I'll use free bluetooth app, Yes, No, Z-Wave hub (inc. Samsung SmartThings); Handle type[3]: Top screw above handle, Top screw beneath handle, Escutcheon; Handle colour (choose Chrome for escutcheon)[5]: Gold, White, Black, Chrome…; Cylinder Size[6]: 30, 35, 40, 45… | ultion-smart-complete | 0 | in | N |
| 79161 | Ultion SMART and Wireless Keypad | `/ultion-smart-and-wireless-keypad/` | bundle | £0.00 SALE | 0 |  | bundles | 1 | **OUT** | N |
| 107247 | Wireless Keypad | `/wireless-keypad-bundle/` | simple | £59.00 | 0 |  | ultion-smart | 1 | in | N |
| 123069 | Ultion locks | `/ultion-locks/` | variable | £56.00–£72.00 | 221 | Size[103]: 75int/10ext, 75int/30ext, 75int/35ext, 75int/40ext…; Cylinder Colour[3]: Standard Colour, Chrome, Brass; Cylinder Type[1]: 3 Star Plus | locks | 1 | in | N |
| 123425 | Ultion locks to code | `/ultion-locks-to-code/` | variable | £58.00–£77.00 | 209 | Size[103]: 75int/55ext, 75int/50ext, 75int/45ext, 75int/40ext…; Cylinder Colour[3]: Standard Colour, Chrome, Brass; Cylinder Type[1]: 3 Star Plus | locks | 1 | in | N |
| 123780 | Ultion thumbturn | `/ultion-thumbturn/` | variable | £69.00–£78.00 | 155 | Size[84]: 75int/55ext, 75int/50ext, 75int/45ext, 75int/40ext…; Cylinder Colour[3]: Standard Colour, Chrome, Brass; Cylinder Type[1]: 3 Star Plus | locks | 1 | in | N |
| 124286 | Ultion thumbturn to code | `/ultion-thumbturn-to-code/` | variable | £74.00–£83.00 | 157 | Size[83]: 75int/55ext, 75int/50ext, 75int/45ext, 75int/40ext…; Cylinder Colour[3]: Standard Colour, Chrome, Brass; Cylinder Type[1]: 3 Star Plus | locks | 2 | in | N |
| 129223 | Ultion SMART Cylinder | `/ultion-smart-cylinder/` | variable | £69.00 | 9 | Size[9]: ext30, ext35, ext40, ext45… | locks | 1 | in | N |
| 129311 | Ultion SMART Cylinder to code | `/ultion-smart-cylinder-to-code/` | variable | £69.00 (was £74.00) | 9 | Size[9]: ext30, ext35, ext40, ext45… | locks | 1 | in | N |
| 142433 | Smart Motor | `/smart-motor/` | variable | £150.00 | 4 | Connectivity[4]: Homekit, Zigbee, Bluetooth, Zwave | — | 0 | in | N |
| 242184 | Security Handle – 2 Star | `/2-star-handle/` | variable | £27.00–£56.00 | 21 | Size[2]: Long, Short; Handle[2]: Lever, Pad; Colour[7]: Anthracite Grey, Black, Chrome, Gold… | security-handle | 8 | in | Y |
| 242186 | Security Handle – 2 Star PLUS | `/2-star-plus-handle/` | variable | £56.00–£84.00 | 14 | Size[2]: Long, Short; Handle[1]: Lever; Colour[7]: Anthracite Grey, Black, Chrome, Gold… | security-handle | 10 | in | Y |
| 242188 | Ultion KeyTag | `/ultion-keytag/` | variable | £39.00 | 5 | Colour[5]: Black, Red, Orange, Yellow… | keytag | 7 | in | Y |
| 242190 | Bridge | `/nuki-bridge/` | simple | £89.00 | 0 |  | ultion-nuki, unu-accessories | 1 | in | Y |
| 242192 | External Handle | `/nuki-external-handle/` | variable | £14.90–£20.90 | 12 | Colour[6]: Chrome, Black, Gold, Rose Gold…; Size[2]: 211mm, 122mm | ultion-nuki, unu-accessories | 1 | in | Y |
| 242194 | Ultion Nuki with Bridge | `/ultion-nuki/` | simple | £239.00 | 0 |  | ultion-nuki, un | 12 | in | N |
| 242198 | Ultion Nuki Key Fob | `/nuki-key-fob/` | simple | £49.00 | 0 |  | ultion-nuki, unu-accessories | 1 | in | Y |
| 242200 | Rechargeable Battery | `/nuki-rechargeable-battery-2-2/` | variable | £49.00 | 1 | Colour[2]: Black, White | ultion-nuki, unu-accessories | 1 | in | Y |
| 242202 | Ultion Nuki with Bridge and Fingerprint Keypad | `/ultion-nuki-bundle-1/` | bundle | £370.00 | 0 |  | ultion-nuki, un | 11 | in | Y |
| 242204 | Ultion Nuki with Bridge and Keyfob | `/ultion-nuki-bundle-2/` | bundle | £279.00 | 0 |  | ultion-nuki, un | 11 | in | Y |
| 242206 | Ultion Nuki with Bridge, Fingerprint Keypad and Keyfob | `/ultion-nuki-bundle-3/` | bundle | £405.00 | 0 |  | ultion-nuki, un | 10 | in | Y |
| 242208 | Ultion Nuki – Bundle 4 | `/ultion-nuki-bundle-4/` | bundle | £425.00 | 0 |  | ultion-nuki, un | 10 | in | N |
| 242210 | Ultion Nuki – Fob Bundle | `/ultion-nuki-fob-bundle/` | bundle | £129.00 | 0 |  | ultion-nuki, unu-accessories | 1 | in | Y |
| 242212 | Ultion Nuki | `/ultion-nuki-options/` | variable | £259.00 | 10 | Cylinder Size[10]: No cylinder, 30, 35, 40… | ultion-nuki, un | 1 | in | N |
| 249445 | Ultion Nuki Bundles | `/ultion-nuki-bundles/` | variable | £239.00–£424.00 | 36 | Cylinder Size[9]: No Cylinder, 30, 35, 40…; Bundle[4]: Bundle 1, Bundle 2, Bundle 3, Bundle 4 | bundles, un | 0 | in | N |
| 250816 | 1 Star Plus Lock | `/1-star-lock/` | variable | £43.00–£49.00 | 107 | Type[2]: Thumbturn, Key; Colour[1]: Dual; Size[77]: 10/30, 10/35, 10/40, 10/45… | 1-star-lock | 1 | in | N |
| 250818 | 1 Star Plus Lock to Code | `/1-star-lock-code/` | variable | £48.00–£54.00 | 107 | Type[2]: Thumbturn, Key; Colour[1]: Dual; Size[77]: 10/30, 10/35, 10/40, 10/45… | 1-star-lock | 1 | in | N |
| 251274 | 3 Star Lock | `/3-star-lock/` | variable | £53.00–£59.00 | 131 | Type[2]: Thumbturn, Key; Colour[1]: Dual; Size[87]: 10/30, 10/35, 10/40, 10/45… | 3-star-lock | 1 | in | N |
| 251276 | 3 Star Lock to Code | `/3-star-lock-code/` | variable | £58.00–£64.00 | 131 | Type[2]: Thumbturn, Key; Colour[1]: Dual; Size[87]: 10/30, 10/35, 10/40, 10/45… | 3-star-lock | 1 | in | N |
| 277840 | Ultion Nuki Pro | `/ultion-nuki-pro/` | simple | £349.00 | 0 |  | ultion-nuki, un | 0 | in | N |
| 277844 | Ultion Nuki Pro | `/ultion-nuki-pro-2/` | variable | £280.00–£320.00 | 10 | Cylinder Size[10]: No cylinder, 30, 35, 40… | ultion-nuki, un | 0 | in | N |
| 306175 | Ultion Nuki PLUS | `/ultion-nuki-plus-options/` | variable | £379.00 | 20 | colour[2]: Black / Steel, White / Steel; cylinder size[10]: No cylinder, 30, 35, 40… | nuki-postpay, un | 0 | in | N |
| 306196 | Ultion Nuki PLUS Bundles | `/ultion-nuki-plus-bundles/` | variable | £419.00–£545.00 | 60 | colour[2]: Black / Steel, White / Steel; cylinder size[10]: No cylinder, 30, 35, 40…; bundle[3]: Bundle 1, Bundle 2, Bundle 3 | nuki-postpay, un | 0 | in | N |
| 306203 | Ultion Nuki Plus | `/ultion-nuki-plus/` | variable | £320.00 | 2 | Colour[2]: Black / Steel, White / Steel | ultion-nuki-plus, un | 9 | in | Y |
| 306272 | Wireless fingerprint keypad | `/nuki-key-pad-fingerprint/` | simple | £145.00 | 0 |  | ultion-nuki, unu-accessories | 1 | in | Y |
| 319148 | Ultion Lock Lubricant | `/ultion-lock-lubricant/` | variable | £12.95–£27.95 | 3 | Pack Size[3]: 1, 2, 3 | lock-lubricant | 1 | in | Y |
| 319504 | Ultion Gate Sign | `/ultion-gate-sign/` | simple | £9.50 | 0 |  | gate-sign | 1 | in | Y |
| 333141 | Ultion Long Lever DDA Handle | `/door-handle-dda-compliant/` | variable | £24.90–£30.90 | 5 | Colour[5]: Black, Chrome, Gold, Satin Nickel… | handles | 6 | in | Y |
| 342811 | Ultion Nuki with Keyfob – To work with doors with Ultion Bolt | `/ultion-nuki-bundle-2-transmitter/` | bundle | £318.00 | 0 |  | nuki-bolt-staging, ultion-nuki-bolt, un | 10 | in | Y |
| 342815 | Ultion Nuki with fingerprint keypad and key fob – To work with doors with Ultion Bolt | `/ultion-nuki-bundle-3-transmitter/` | bundle | £444.00 | 0 |  | nuki-bolt-staging, ultion-nuki, un | 10 | in | Y |
| 342816 | Ultion Nuki with Fingerprint Keypad – To work with doors with Ultion Bolt | `/ultion-nuki-bundle-1-transmitter/` | bundle | £409.00 | 0 |  | nuki-bolt-staging, ultion-nuki-bolt, un | 11 | in | Y |
| 342817 | Ultion Nuki – To work with doors with Ultion Bolt | `/ultion-nuki-transmitter/` | simple | £278.00 | 0 |  | nuki-bolt-staging, ultion-nuki-bolt, un | 12 | in | Y |
| 342818 | Ultion Nuki – To work with doors with Ultion Bolt | `/ultion-nuki-transmitter-options/` | variable | £298.00 | 10 | Cylinder Size[10]: No cylinder, 30, 35, 40… | nuki-bolt-staging, ultion-nuki-bolt, un | 1 | in | N |
| 342829 | Ultion Nuki Bundles – To work with doors with Ultion Bolt | `/ultion-nuki-bundles-transmitter-2/` | variable | £338.00–£464.00 | 30 | Cylinder Size[10]: No Cylinder, 30, 35, 40…; Bundle[3]: Bundle 1, Bundle 2, Bundle 3 | nuki-bolt-staging, nuki-bolt-postpay, un | 0 | in | N |
| 342897 | Ultion Nuki Pro – To work with doors with Ultion Bolt | `/ultion-nuki-pro-transmitter/` | simple | £388.00 | 0 |  | nuki-bolt-staging, ultion-nuki-bolt, un | 0 | in | N |
| 342899 | Ultion Nuki Pro – To work with doors with Ultion Bolt | `/ultion-nuki-pro-transmitter-options/` | variable | £309.00–£359.00 | 10 | Cylinder Size[10]: No cylinder, 30, 35, 40… | nuki-bolt-staging, ultion-nuki-bolt, un | 0 | in | N |
| 342912 | Ultion Nuki Plus – To work with doors with Ultion Bolt | `/ultion-nuki-plus-transmitter/` | variable | £359.00 | 2 | Colour[2]: Black / Steel, White / Steel | nuki-bolt-staging, ultion-nuki-plus-bolt, un | 9 | in | Y |
| 342920 | Ultion Nuki PLUS – To work with doors with Ultion Bolt | `/ultion-nuki-plus-transmitter-2/` | variable | £378.00–£418.00 | 20 | colour[2]: Black / Steel, White / Steel; cylinder size[10]: No cylinder, 30, 35, 40… | nuki-bolt-staging, nuki-bolt-postpay, un | 0 | in | N |
| 342941 | Ultion Nuki PLUS Bundles – To work with doors with Ultion Bolt | `/ultion-nuki-plus-bundles-transmitter/` | variable | £359.00–£584.00 | 60 | colour[2]: Black / Steel, White / Steel; cylinder size[10]: No cylinder, 30, 35, 40…; bundle[3]: Bundle 1, Bundle 2, Bundle 3 | nuki-bolt-staging, nuki-bolt-postpay, un | 0 | in | N |
| 365298 | Ultion Nuki Plus with fingerprint keypad | `/ultion-nuki-plus-bundle-1/` | variable | £450.00 | 2 | Colour[2]: Black / Steel, White / Steel | ultion-nuki-plus, un | 10 | in | Y |
| 365334 | Ultion Nuki Plus with keyfob | `/ultion-nuki-plus-bundle-2/` | variable | £360.00 | 2 | Colour[2]: Black / Steel, White / Steel | ultion-nuki-plus, un | 9 | in | Y |
| 365346 | Ultion Nuki Plus with fingerprint keypad and keyfob | `/ultion-nuki-plus-bundle-3/` | variable | £486.00 | 2 | Colour[2]: Black / Steel, White / Steel | ultion-nuki-plus, un | 10 | in | Y |
| 365379 | Ultion Nuki Plus with fingerprint keypad – To work with doors with Ultion Bolt | `/ultion-nuki-plus-bundle-1-transmitter/` | variable | £489.00 | 2 | Colour[2]: Black / Steel, White / Steel | ultion-nuki-plus-bolt, un | 10 | in | Y |
| 365466 | Ultion Nuki Plus with keyfob – To work with doors with Ultion Bolt | `/ultion-nuki-plus-bundle-2-transmitter/` | variable | £399.00 | 2 | Colour[2]: Black / Steel, White / Steel | ultion-nuki-plus-bolt, un | 9 | in | Y |
| 365479 | Ultion Nuki Plus with fingerprint keypad and keyfob – To work with doors with Ultion Bolt | `/ultion-nuki-plus-bundle-3-transmitter/` | variable | £525.00 | 2 | Colour[2]: Black / Steel, White / Steel | ultion-nuki-plus-bolt, un | 10 | in | Y |
| 367351 | Lock Lubricant | `/lock-lubricant/` | simple | £0.00 | 0 |  | — | 0 | in | N |
| 385274 | Ultion Security Handle | `/ultion-security-handle/` | variable | £35.00–£55.00 | 31 | Model[2]: Ultion 2 Star Security Handle, Ultion 2 Star PLUS Security Handle; Fixing Position[2]: Above Handle, Below Handle; Handle Type[2]: Lever, Pad; Colour[7]: Anthracite Grey, Black, Chrome, Gold… | security-handle | 9 | in | Y |
| 394215 | Ultion Nuki – Escutcheon Pull Plate | `/ultion-nuki-pull/` | variable | £0.00 | 3 | Colour[3]: White, Black, Chrome | ultion-nuki, un | 0 | in | N |
| 422334 | Ultion Sweet Escutcheon | `/ultion-sweet-escutcheon/` | variable | £12.90–£15.90 | 25 | Escutcheon or Pull[2]: Escutcheon, Pull; Size[2]: Regular, Slim; Colour[7]: Anthracite Grey, Black, Chrome, Gold… | ultion-sweet | 7 | in | Y |
| 422375 | Ultion Sweet Handle | `/ultion-sweet-handle/` | variable | £19.90–£32.90 | 20 | Handle Type[2]: Lever handle, Pad handle; Size[2]: 211mm, 122mm; Colour[7]: Anthracite Grey, Black, Chrome, Gold… | ultion-sweet | 7 | in | Y |
| 422930 | Ultion Sweet Knocker | `/ultion-sweet-knocker/` | variable | £15.90–£22.90 | 26 | Style[2]: Contemporary, Traditional Urn; Include Spyhole[2]: Yes, No; Colour[7]: Anthracite Grey, Black, Chrome, Gold… | ultion-sweet | 11 | in | Y |
| 423074 | Ultion Sweet Letterplate | `/ultion-sweet-letterplate/` | variable | £29.90–£34.90 | 12 | Shape[2]: Squared, Rounded; Colour[7]: Anthracite Grey, Black, Chrome, Gold… | ultion-sweet | 5 | in | Y |
| 423105 | Ultion Sweet Numerals | `/ultion-sweet-numerals/` | variable | £12.90–£13.90 | 65 | Numeral[13]: Numeral 0, Numeral 1, Numeral 2, Numeral 3…; Colour[6]: Black, Chrome, Gold, Rose gold… | ultion-sweet | 9 | in | Y |
| 424317 | Ultion Sweet Patio Handle | `/ultion-sweet-patio-handle/` | variable | £29.00–£49.00 | 7 | Colour[7]: Anthracite Grey, Black, Chrome, Gold… | ultion-sweet | 2 | in | Y |
| 424339 | Ultion Sweet Blanking Plate | `/ultion-sweet-blanking-plate/` | variable | £14.90–£19.90 | 7 | Colour[7]: Anthracite Grey, Black, Chrome, Gold… | ultion-sweet | 4 | in | Y |
| 431167 | Keys | `/white-label/` | variable | £19.50–£22.50 | 8 | Company[9]: Armis, Cerberus, EROS (MB), Guardian…; Type[2]: 1 Star, 3 Star | white-label | 0 | in | N |
| 434474 | Key | `/key/` | simple | £22.50 | 0 |  | keys | 1 | in | N |
| 476243 | Key | `/key-2/` | simple | £22.50 | 0 |  | keys | 1 | in | N |
| 498718 | Ultion KeyLight | `/ultion-keylight-st/` | variable | £32.00 | 10 | First Digit of the Keycode[1]: U, X or A; Colour[10]: Black body with black insert, Black body with tango insert, Night Bright pink with black insert, Black body with strawberry insert… | keylightst | 1 | in | Y |
| 498732 | Ultion Keycap | `/ultion-keycap-st/` | variable | £9.95 | 22 | First digit of the key code[2]: U, X, A or Z, C; Colour[22]: Night Bright yellow with black insert, Night Bright pink with black insert, Black body with strawberry insert, Black body with black insert… | keycap, keycap-st | 1 | in | Y |
| 507352 | Ultion Nuki Go | `/ultion-nuki-go/` | bundle | £239.00 | 0 |  | ultion-nuki-go | 7 | in | Y |
| 507361 | Nuki Rechargeable Battery | `/nuki-rechargeable-battery/` | simple | £49.00 | 0 |  | ultion-nuki | 1 | in | N |
| 507365 | Ultion Nuki Go – To work with doors with Ultion Bolt | `/ultion-nuki-go-bolt/` | bundle | £278.00 | 0 |  | ultion-nuki-go | 7 | in | Y |
| 507370 | Ultion Nuki Go | `/ultion-nuki-go-postpay/` | variable | £239.00 | 10 | Cylinder Size[10]: 30, 35, 40, 45… | ultion-nuki-go | 1 | in | Y |
| 507385 | Ultion Nuki Go with Ultion Bolt Transmitter | `/ultion-nuki-go-with-ultion-bolt-transmitter/` | variable | £278.00 | 9 | Cylinder Size[9]: 30, 35, 40, 45… | ultion-nuki-go | 1 | in | Y |
| 509772 | Ultion Lock Lubricant | `/ultion-lock-lubricant-2/` | simple | £9.95 (was £12.95) SALE | 0 |  | lock-lubricant | 1 | in | N |
| 517655 | Ultion Lock Lubricant | `/ultion-lock-lubricant-st/` | variable | £12.95–£27.95 | 3 | Pack Size[3]: 1, 2, 3 | lock-lubricant | 1 | in | N |
| 519633 | Ultion Nuki Door Sensor | `/ultion-nuki-door-sensor/` | simple | £55.00 | 0 |  | ultion-nuki-door-sensor | 1 | in | Y |
| 538363 | Ultion Nuki | `/ultion-nuki-2025/` | variable | £339.00 | 3 | Colour[3]: White/Steel, Black/Steel, Chrome/Steel | ultion-nuki-2025 | 7 | in | Y |
| 538366 | Ultion Nuki | `/ultion-nuki-2025-options/` | variable | £339.00 | 30 | Colour[3]: White/Steel, Black/Steel, Chrome/Steel; Cylinder Size[10]: 00, 30, 35, 40… | ultion-nuki-2025 | 1 | in | N |
| 538394 | Ultion Nuki – To work with doors with Ultion Bolt | `/ultion-nuki-2025-bolt/` | variable | £378.00 | 3 | Colour[3]: White/Steel, Black/Steel, Chrome/Steel | ultion-nuki-2025 | 1 | in | Y |
| 538398 | Ultion Nuki with Ultion Bolt Transmitter | `/ultion-nuki-2025-bolt-options/` | variable | £378.00 | 27 | Colour[3]: White/Steel, Black/Steel, Chrome/Steel; Cylinder Size[9]: 30, 35, 40, 45… | ultion-nuki-2025 | 1 | in | N |
| 618077 | Ultion Nuki | `/ultion-nuki-st/` | variable | £339.00 | 3 | Colour[3]: White/Steel, Black/Steel, Chrome/Steel | ultion-nuki-2025 | 7 | in | N |

#### 3.3 Price architecture observed
- 3 Star PLUS cylinder via configurator: **£56–£73** (JSON-LD on `/get-locks/product/`: price 63, minPrice 56, maxPrice 73). Backing SKUs: key £56–£72, key-to-code £58–£77, thumbturn £69–£78, thumbturn-to-code £74–£83. "To code" (keyed-alike to an existing keycode) carries a ~£2–£5 premium.
- 3 Star Lock (older, vertical key) £53–£59 / to code £58–£64. 1 Star Plus £43–£49 / to code £48–£54.
- Keys: **£22.50 each** (struck-through "£32.45 each" on the order step), KeyTag trackable key £39 (£99 for 3), KeyCap £9.95, KeyLight £32, Lubricant £12.95 (1) – £27.95 (3) (one SKU on sale £9.95 was £12.95).
- Nuki 2025 £339 (+£39 for Bolt-transmitter variant = £378); Nuki Go £239 (£278 with transmitter); Nuki Plus £320–£379; bundles up to £584.
- Handles: 2 Star £27–£56, 2 Star PLUS £56–£84, Ultion Security Handle (combined listing) £35–£55, DDA lever £24.90–£30.90, Sweet furniture £12.90–£49.
- Padlock £54.90–£75.90 (6 body/shackle combos).

#### 3.4 Configurator: `/get-locks/product/` (278,662 B) — "Ultion 3 Star PLUS Lock"
Not a standard Woo single-product template. It is a **custom Alpine.js 3 app** (`alpinejs@3.x.x` from jsdelivr + theme `js/alpine/locks-product.js`, 13,209 B) talking to **admin-ajax** (`ajaxObject.ajax_url`, nonce). Structure top→bottom:

1. Sticky "delivered" marquee (`section.section-locks-scroller`, slick autoplay) populated by AJAX `action=delivery_date_notice` → `{"status":"okay","statement":"Order today, delivers tomorrow"}` (live, date-aware).
2. `div[x-data="locksProduct"] > section.section-get-locks-product`: **Swiper gallery** (main + thumbs) of 6 renders with captions: Key Operated / Thumbturn Operated × Dual Colour / Chrome / Brass.
3. Details column: tags `TS 007 Certified`, `Anti-Snap`; `h1` "Ultion 3 Star PLUS Lock"; **live price** `£<span x-text="total">` with loading overlay (recomputed server-side via `action=get_locks_totals`, body = JSON of locks array); USP bullets: "£5,000 security guarantee." / "Sold Secure Diamond. Tested & approved by locksmiths" / "Police preferred specification. Secure By Design." / "Extra strong molybdenum core with double lockdown mode." / "A 60% thicker, more durable key." / "Free Ultion Key Control for extra security - nobody can cut keys without your permission."
4. **Keycode field**: "Enter keycode to use existing Ultion key with this lock (Learn More)" placeholder `e.g XUIHF2335`, `x-model.debounce.750ms`. Validation regex (theme `regex.js`): keys `/^(((U|X|Z|Y)\d{8}K?)|((A|C)\d{7}K?))$/i`, locks `/^((X|Z|Y)\d{8}K?)$/i`. Branching messages: invalid → "Please enter the keycode engraved on the head of your current key. It is one letter (U, X, Y, Z) followed by 8 numbers."; prefix **U** → "Unfortunately, we have limited stock of U series cylinders and are unable to accept your order online. Please contact our sales team on 0115 784 3162"; prefix **A/C** → "Keyed-alike locks for this keycode are not available for purchase online. Please call 0115 671 2567 to complete your order." Valid keycode → switches products to `*_code` SKUs and shows "This lock is compatible with your current keys, and no new keys are included. You can request additional keys below."
5. **Per-lock rows** (`x-for lock in locks`), each with: info "This lock includes 3 Ultion Keys as standard"; extra-keys stepper (−/+ "N Extra Keys"); **Internal Control** radio (Key Operated / Thumbturn); **Colour** swatches (Standard/Dual, Chrome, Brass); **Internal Size** and **External Size** `<select>`s whose options come from AJAX `action=get_lock_product_sizes` (matrix keyed `product → colour → internalSize → [externalSizes]`, default 35). Matrix: key/Dual internal 10,30–75 mm → 100 combos; key/Brass or Chrome 10,30–60 → ~60; thumbturn/Dual 30–75 → 83; thumbturn/Brass|Chrome 30–55 → 36. Helper line: "Composite doors are usually 35mm and 35mm. **View lock measuring guide.**" (opens `how-fit` modal). Remove-lock button when >1.
6. When >1 lock and no keycode: **keyed-alike radio** "Use different keys for each lock" / "Use the same key for all locks" (+Learn More modal `same-key`); total shows "Total Includes N Keys" (3 keys shared across locks).
7. Buttons: `Add another lock` · `Checkout Now` (disabled while keycode errors) → AJAX `action=locks_add_products_to_basket` → response `data.checkout` URL → `window.location.replace` (skips cart, straight to checkout).
8. `section.section-get-locks-product-popup`: **sticky summary bar** ("Total: £X · Qty: N Lock(s) · Checkout Now") toggled by GSAP ScrollTrigger once the user scrolls past the product block.
9. Trustpilot review slider (slick, 6 quotes with 5-star SVG, e.g. "Advised Best Lock Replacement… The £5000 guarantee if access gained through this lock was an added incentive — Boot Buyer").
10. Content sections (h2): "Molybdenum: 25% denser than iron. Extreme durability." · "Entering Lockdown Mode." · "As safe as houses." · "Ultion protects over 3 million British homes" · "Save £80" (Nuki cross-sell) · "Keyed Alike." · "New Ultion Lock. Same Ultion Key."; h3s: "Tested for over 1,000,000 cycles", "Anti-everything.", "Ultion £5000 Guarantee.", "Protected by KeyControl.", "The UK's Thickest Key.", "Quick, Easy Installation."; autoplay lockdown video on scroll (`.js-lockdown-video`), parallax (`.js-lock-protects-parallax`).

Scripts specific to this page: `alpine/locks-product.js`, `pages/get-locks-product.js` (3,439 B: delivery marquee, review slider, GSAP), `regex.js`, `lock-regex-no-u.js`, Swiper, plus the generic Woo Product Add-ons/PEWC/WCPA/Swatches bundles (loaded but unused here).

#### 3.5 Key ordering: `/get-keys/product/` (254,492 B) — "The Ultion Key©"
Title tag: **"Genuine Ultion Keys - Delivered Next Day - Official Store"** (only page with a proper marketing title). Structure:
1. Delivery marquee (same AJAX) · warning banner **"Non-genuine Keys Damage Your Lock & Invalidate Your Guarantee"**.
2. Product block: h1 "The Ultion Key ©", **£22.50**, bullets: Genuine Ultion Key From Manufacturer · Maintains Ultion guarantees · Works with Ultion Key Control · Police Preferred Specification · Thick, Ultra-Durable No-Snap Design · Each Key is Precision Machine Cut · Engraved Keycode for Your Security.
3. `<form method="post" action="/get-keys/order-keys/" class="js-keys-form">` (Alpine inline validation): hidden `keys_order=Get Keys - Product`; **"How many keys do you need?"** radio `key_options` 1–6 ("Note: We recommend ordering enough keys to leave a spare."); **"What's your keycode? (engraved on your current key)"** `keycode_number` placeholder `e.g XUIHF2335`, error "It is one letter followed by 7 or 8 numbers."; submit **"Get price and buy"**.
4. Step 2 (`/get-keys/order-keys-3/`, GET-able, 276,828 B): "Order Keys to (keycode)"; options **Ultion Key © With Free KeyCaps** "£32.45 each" struck → **£22.50 each**, "Include KeyCaps for free (What's this?)" toggle; **Ultion Trackable Key £39 each** (KeyTag); **Ultion Lubricant – Protect Your Guarantees** upsell; each with "Delivers [date]" and Add to Basket; "Prefer to order by phone?"; modal "Ultion Keycode — Your KeyCode is the unique 9 digits…".
5. Alternative path `/get-keys/get-keys-delivered/`: **callback booking** ("We need to confirm your keycode with you. We double check all keycodes at order to ensure your keys go to the right people… This call typically takes less than two minutes.") fields: name, phone, preferred time (`time_selected`, `call_back_time`, `callback_day`), reCAPTCHA; phone 0115 697 4265.
6. Trustpilot slider (10 quotes focused on next-day keys), "The Real Deal. Secure, precision cut keys from Ultion." ("cheap Ultion 'compatible' keys… will invalidate your Ultion guarantees (including the £5,000 home guarantee)"), "Key Protection with Key Control" ("unique 10-digit code to stop people copying your key without your authorisation"), "Save £80" Nuki banner.
Backing SKUs: `Keys` (8369, 37 colour variations £5.99–£29), `Key` (434474 / 476243 £22.50), `Ultion Keycap`, `White label` keys (Armis, Cerberus, EROS, Guardian, Ingenious, Safeware, Solid as a Lock, Total Hardware, Watchdog — OEM brands using Ultion cylinders).

---

### 4. PRODUCT PAGE ANATOMY

Common chrome on all three: sticky delivery marquee (`.bar-delivery-scroller.sticky` → AJAX text "Order today, delivers tomorrow"), WooThumbs Premium gallery (Iconic; `iconic-woothumbs-*`, stacked horizontal thumbnails, zoom/lightbox icons), `.bar-trustpilot-installer` ("Trustpilot ★★★★½ 12500+ reviews" static SVGs + **"Are you an installer? Click Here"** → brisant-secure.com trade site), quantity stepper with custom ± SVG buttons, "Add to Basket" (`cartRedirectAfterAdd: true` → goes to cart), `gtm4wp_product_data` hidden input for GA4 ecommerce. No Woo tabs, no native reviews, no related/upsell blocks — all cross-sell is hand-built in the theme.

#### 4.1 Cylinder: `/product/3-star-lock/` (1,199,058 B — 1.2 MB because 131 variations are inlined in `data-product_variations`)
`<meta robots noindex,nofollow>`, no canonical — a **hidden backing product**, not the consumer path. Order: delivery bar → gallery (`KEYED_3Star_Perspective.png`) → "Not sure what you need? **Chat with a Specialist**" (`.woo-product-chat-btn`, links to `/contact/`) → `h1` "3 Star Lock" → price "£53 – £59" → Woo Variation Swatches Pro: **Type** (Thumbturn / Key buttons), **Colour** (Dual), **Size** dropdown of 87 `int/ext` values (`10/30 … 75/75`) → Quantity → Add to Basket → Trustpilot/installer bar. Nothing else (no description, FAQs, video). JSON-LD: Product/AggregateOffer low 53 high 59 offerCount 131.

#### 4.2 Smart lock: `/product/ultion-nuki-2025/` (435,206 B, indexable, canonical set) — "Ultion Nuki" £339
1. Delivery bar → gallery (7 images; `nuki-2025-banner-image@2x-1.jpg` 1000×1000 OG).
2. Summary: `h1` "Ultion Nuki" · price £339 · short description "New and improved, the Ultion Nuki is our latest evolution of our award-winning smart lock, now with an ultra-sleek streamlined design, built-in Wi-Fi bridge, and Ultion's reputation for supreme home security." · **"Compatible with"** logo row (smart platforms) · **Colour swatches** "Select colour (Selected)" White/Steel · Black/Steel · Chrome/Steel.
3. **Add-ons (Product Extras for WooCommerce, `pewc-*`)**: required group "Select added options **(Learn More)** *" rendered as 3-column image checkboxes of child products: **Fob +£49** (242198) · **Fingerprint Keypad +£145** (306272) · **Auto-Lock Sensor +£55** (door sensor); grand total `#pewc-grand-total`. Then **WooCommerce Product Add-Ons** text field **"Keycode"** (placeholder `XUIHF2335`, letters/numbers only) so the included 3* PLUS cylinder can be keyed to existing keys. Quantity → Add to Basket.
4. Trustpilot/installer bar → `section-nuki-expert-reviews` (single image `nuki-as-seen-in.jpg` alt "As Seen In" — **media names not in HTML text, unverified**) → `section-nuki-fits-2` ("One size fits all — designed to fit existing doors with handle fixings of 215mm, 211mm, 122mm and even doors with an escutcheon lock") → `section-nuki-hands-free` ("Hands free auto-unlock for freedom of movement") → `section-nuki-features` ("The key is the key"; **"Still keeping the bad guys out — The heart of the Ultion Nuki is a 3-star PLUS Ultion lock, and the Nuki unit has the highest AV security rating, with three stars."**; "Press, twist and relax") → `section-nuki-accessories-alt` ("Open up a better way of living with our exclusive accessories": External Handle £19 "20-year anti-corrosion guarantee", Key fob £49, Wireless fingerprint keypad £145 "200 different passwords", Door Sensor — each with Add to basket) → **FAQ accordion** (`cn-accordion`, 15 questions: "How secure is the Smart Lock?", "How easy is it to fit and setup…", "I need to lift the door handle to lock my door…", "What happens if there is a power cut, or my Wi-Fi goes down?", "How long do the batteries last…", "Are there any ongoing charges?", "Will it fit my door?", auto lock/unlock, manual operation, keypad, "Is the Ultion Nuki compatible with my Smart Home?" (HomeKit, Google Home, Alexa), "What's to stop someone shouting 'Alexa, unlock my door' through the letterbox?", "Can I use my existing lock and key?", "Is the Ultion Nuki suitable for AirBnb?") → lightbox "Add-ons Explained" → "New Ultion Nuki. Same Ultion Key.".
Security copy quoted: "Ultion Nuki features the 3 star plus Ultion cylinder, and carries a **£5000 security guarantee**. There is no security standard that this locking mechanism has not passed." / "the highest AV-TEST available (level 3). The Ultion Nuki cylinder also carries the **BSI Kitemark**." No video on the product page (the `/ultion-nuki-2025/` landing has "Installation Guide (34s)" and "From box to door in 4 minutes").

#### 4.3 Accessory: `/product/ultion-keytag/` (490,406 B, indexable) — "Ultion KeyTag" £39 / £99 for 3
1. Delivery bar → gallery (7 imgs) → `.product-bar`: "✓ Want to speak to an expert? Call us on **0115 6714033**" + `.delivery-message` (AJAX).
2. Summary: `h1` · price "**£39 / £99 for 3**" · short description ("…attaches to your Ultion Key to allow you to use your phone to locate them… we end-to-end encrypt all information… Each keyTag comes with a new Ultion key. **Does not work with Android.**") · **Select Colour** dropdown (Black, Red, Orange, Yellow, Pink) · required Add-On **"Keycode *"** · "**How many KeyTags do you need?**" stepper · Add to Basket.
3. `.ultion-product-reviews` slider (6 customer quotes, e.g. "I literally received it the next day via DPD") → Trustpilot/installer bar → `.product-info-video` (Vimeo **779194598**, click-to-play) → title banner "The Features / KeyTag Overview" → features grid (No more lost keys "We've partnered with Apple… Siri and 'Find My'"; The KeyTag is the key; Replaceable battery; End-to-end encrypted; Tap on the app; Works with KeyControl "free KeyControl to stop unauthorised key copying") → "How it Works" repeatable content (One tap to find your keys; Auto-detects left behind keys; Ultion-powered data security; A simple app to manage keys) → **FAQs** (8: Android?, multiple devices, battery type/life, tracking range, subscription?, KeyTag+KeyLight) → `section-locks-alps-protects` "Securing the UK — Ultion protects over 3 million British homes — Upgrade Your Locks" → "Ultion KeyCode." lightbox → delivered marquee.

#### 4.4 Also checked
`/product/ultion-security-handle/` (1,571,623 B — largest page; 31 variations + heavy content): "£5,000 security guarantee when paired with an Ultion Lock. Fully-reinforced curved body… Sold Secure Accredited & Secure by Design – tested by locksmiths, approved by Police. Molybdenum lock shroud… 20 year anti-corrosion guarantee"; "Which handle is right for you?" comparison lightbox (2 Star £19–£56 vs 2 Star PLUS). `/product/padlocks/` 561,162 B.

---

### 5. TECH STACK & THIRD PARTIES

**Platform:** WordPress **6.8.2** (Bedrock-style layout: core under `/wp/`, plugins `/app/plugins/`, theme `/app/themes/`, uploads `/app/uploads/`), WooCommerce **10.1.2**, PHP/Apache **2.4.52 (Ubuntu)**, no CDN/WAF headers (no Cloudflare), HTTP/1.1 with `Upgrade: h2`. Compression on (homepage 273 KB → **63 KB** transferred; TTFB ≈0.33 s). Cookies set on first hit: `_fbp`, `wp_woocommerce_session_*`, `ultion_user_id` (custom 30-day UUID).

**Theme:** `consultancy` (custom build; agency domain theconsultancy.co.uk referenced in HTML). Theme assets: `css/style.min.css` (**2,242,375 B uncompressed / 212,764 B compressed**), `js/navigation.js`, `lightbox.js`, `regex.js`, `pages/home.js`, `pages/get-locks-product.js`, `pages/get-keys-product.js`, `alpine/locks-product.js`, `shared-sections/security-promise.js`, `videos-action.js`, self-hosted MP4s under `assets/videos/`.

**Plugins visible in HTML (14):** woocommerce · woocommerce-gateway-stripe · klarna-payments-for-woocommerce 4.2.0 · woocommerce-product-bundles 8.4.2 · woocommerce-product-addons 7.9.2 (official) · product-extras-for-woocommerce 3.26.15 (PEWC) · woo-custom-product-addons 3.1.8 (WCPA — a third add-on plugin) · woo-variation-swatches 2.5.0 + woo-variation-swatches-pro 2.5.1 · woocommerce-additional-variation-images 2.3.2 · woothumbs-premium (Iconic WooThumbs) · duracelltomi-google-tag-manager 1.22.1 (GTM4WP) · facebook-for-woocommerce 3.7.1 · **ultion-callhandler** (custom; callback booking). **Via REST namespaces:** Yoast SEO (`yoast/v1`), Jetpack (`jetpack/v4`, Boost, Stats, Blaze), Redirection, **WebP Converter for Media** (`webp-converter/v1`), WooCommerce Analytics, Product Add-Ons v2. WP Rocket: a code comment "Fix: wp-rocket" and `nowprocket` attributes exist but no WP Rocket output markers → **(unverified)**. Elementor: not used (only a string inside a Woo init-trigger list).

**Payments (from `wcSettings.paymentMethodData`):** sort order `stripe, paypal, klarna_payments`. **Stripe** title "Credit / Debit Card": UPE on, **Express Checkout Element on** (`isECEEnabled`, `isPaymentRequestEnabled`, `shouldShowExpressCheckoutButton: true` → Apple Pay / Google Pay buttons where supported), Link off, Amazon Pay off, Optimized Checkout accordion layout, card icons Visa/Amex/Mastercard, prepaid allowed, account country GB, `allowed_shipping_countries: ["FR","GG","IE","JE","GB"]`, button style dark/48px/"buy". **PayPal** (WooCommerce core PayPal Standard block `wc-payment-method-paypal.js`). **Klarna Payments** (production, "Pay with Klarna", `x.klarnacdn.net/kp/lib/v1/api.js` 520 KB loaded on every page). Legacy `/woo_barclaycardcw/` page exists (Barclaycard — **unverified** whether still active). Live Stripe publishable key is exposed in page config (normal).

**Analytics / marketing tags:** Google Tag Manager **GTM-PZ2NQF2** via GTM4WP (dataLayer with ecommerce, Vimeo tracking, form-move tracker, content tracking) · Meta Pixel via Facebook for WooCommerce (pixel id configured server-side, `_fbp` cookie set by server; CAPI param builder from `unpkg.com/meta-capi-param-builder-clientjs`; `facebook-domain-verification` meta) · **VWO** (Visual Website Optimizer) account **767674**, async SmartCode that hides `body` until loaded (A/B testing) · Jetpack Stats (`stats.wp.com/s-202646.js`, `e-202646.js`) + WooCommerce Analytics · `groupcreative365.com/js/806652.js` + noscript pixel (B2B visitor-identification tracker, **vendor unverified**) · WooCommerce Order Attribution (sourcebuster). No Hotjar, Klaviyo, TikTok, Pinterest, Clarity, Bing found.

**Cookie consent:** OneTrust (`cdn.cookielaw.org/scripttemplates/otSDKStub.js`, `data-domain-script="019aa317-b583-770d-9d68-4ae5612b0c62"`; a second copy is commented out at the top of `<head>`). `/cookies/` page is just "Cookie Policy — Cookie Settings" (OneTrust-driven); `/privacy/` has "Submit DSR" link.

**Chat:** Tawk.to live-chat widget (`embed.tawk.to/5c77c75ea726ff2eea59e74d/default`) — noted and ignored per brief. "Chat with a Specialist" on product pages just links to `/contact/`.

**Reviews:** Trustpilot — but **static** (theme SVGs `trustpilot-logo.svg`, `trustpilot-stars-four-half.svg`, hard-coded "12500+ reviews" and hand-picked quotes). No TrustBox widget, no `trustpilot.com` script, no Review schema.

**Video:** Vimeo Player API (`player.vimeo.com/api/player.js` loaded twice) — 10 Vimeo iframes on homepage (ids 694070923, 373373262, 349028666, 324262061, 232045012, 659054538, 659061716, 794092532, 200998682 + GTM) opened in lightboxes; 6 self-hosted autoplay-muted `<video>` MP4s (hero desktop 2.87 MB + mobile 1.57 MB, keyedalike 2.22 MB, keytag banners 0.79/1.11 MB, lock-exploded 0.35 MB).

**Fonts:** Adobe Fonts/Typekit `use.typekit.net/vtc6oqu.css` → **sofia-pro** (body, 83 CSS refs) + **alternate-gothic-no-2-d** (display); Font Awesome 5 Pro referenced in CSS (icons mostly inline SVG `<symbol>` sprite). Dashicons and WP block-library CSS also loaded (116 KB).

**Images:** 64 `<img>` on homepage (30 jpg, 18 png, 15 svg, 1 FB pixel), 45 with `srcset`, **30 `loading="lazy"`**, 0 `<picture>`, 0 `fetchpriority`, 0 preload hints (only `preconnect` to VWO + 5 `dns-prefetch`). Served from same origin (`/app/uploads/`), **WebP via content negotiation** (`Vary: Accept`; e.g. `home-thickest-key.png` 366,100 B → 47,378 B as `image/webp`). Homepage images+videos referenced: 56 files, **11.7 MB** (videos ≈8.9 MB).

**Front-end libraries:** jQuery 3.7.1 + jquery-migrate 3.4.1, jQuery UI core/datepicker, GSAP 3.10.4 + ScrollTrigger (cdnjs), slick-carousel 1.8.1 (jsdelivr), Alpine.js 3 (configurator), Swiper (configurator gallery), React 18.3.1 + @wordpress/data etc. (for the Blocks mini-cart), MediaElement, blockUI, accounting.js.

**Homepage weight (static):** **89 external `<script src>` + 43 inline scripts; 19 stylesheets + 12 inline `<style>`.** 108 unique external JS/CSS URLs fetched: **JS 2,285,895 B (2.2 MB) + CSS 2,655,231 B (2.6 MB) = 4.83 MB uncompressed** (theme CSS alone 2.24 MB; Klarna SDK 520 KB; Woo cart/checkout base 204 KB + vendors 158 KB; PEWC 141 KB; react-dom 129 KB; block-library CSS 116 KB; jQuery 88 KB). Woo Blocks cart/checkout React bundles load on the homepage because the mini-cart block is in the header.

---

### 6. SEO / STRUCTURED DATA

| Page | `<title>` | meta description | canonical | robots | JSON-LD |
|---|---|---|---|---|---|
| `/` | **"Home - Ultion Lock"** | **none** | ✓ | index,follow | Yoast graph: WebPage, BreadcrumbList, WebSite+SearchAction, Organization+ImageObject (1,728 B) |
| `/product/ultion-nuki-2025/` | "Ultion Nuki - Ultion Lock" | none | ✓ | index | Yoast graph + **Product** (sku UN-2025, Offer/UnitPriceSpecification 339 GBP VAT incl., validThrough 2027-12-31, brand Thing "Ultion", no aggregateRating) |
| `/product/ultion-keytag/` | "Ultion KeyTag - Ultion Lock" | none | ✓ | index | Yoast graph + Product (39 GBP) |
| `/product/3-star-lock/` | "3 Star Lock - Ultion Lock" | none | **none** | **noindex,nofollow** | Product + AggregateOffer 53–59, offerCount 131 |
| `/get-locks/product/` | "Ultion Lock - Ultion Lock" | none | ✓ | index | Yoast graph + custom Product "Ultion 3 Star PLUS Lock" Offer/PriceSpecification price 63 min 56 max 73 |
| `/get-keys/product/` | "Genuine Ultion Keys - Delivered Next Day - Official Store" | — | — | — | — |
| `/home-truths/` | "Home Truths - Ultion Lock" | none | ✓ | index | Yoast graph |
| blog post (anti-snap) | "Anti-Snap Locks Explained: … - Ultion Lock" | ✓ ("What are anti-snap locks…A clear UK guide to standards, ratings and costs.") | — | — | Article + Person + graph |

- **Open Graph** on all pages (`og:locale en_GB`, `og:type website|article`, title, url, site_name; products add `og:description`, `og:image` 1000×1000 or 1500×1500); Twitter `summary_large_image`, `@UltionLock`.
- **hreflang:** none anywhere. Single locale `en-GB`.
- **Homepage headings:** **no `<h1>`**. 18 `<h2>`: "Don't Forget" (mini-cart), "In 9 seconds you'll want to replace your lock", "Find the right protection for you", "The very best protection for British homes", "Fitting the highest security protection is the key", "64%", "of burglaries happen when someone is at home", "Buy more Ultion locks and keys here", "Multipoint locks just got smarter", "Smarter locking for UK homes", "The UK's thickest key", "One key for all locks", "Stop losing keys. Start Find My keys.", "Key security promise by Ultion", "Register your £5,000 guarantee.", "See Ultion in action", "Ultion Sweet. Your door never looked so good.", "Save £80". 47 `<h3>` (mostly mega-menu product names repeated 3× for desktop/mobile/footer). Product pages carry two `<h1>`s on KeyTag (summary + banner).
- Generic page titles ("Home - Ultion Lock", "Ultion Lock - Ultion Lock") and absent meta descriptions on all commercial pages = weak on-page SEO despite Yoast; blog posts are properly optimised.
- Sitemap exposes shipping-class taxonomy and dozens of thank-you/landing pages.

---

### 7. TRUST & CONTENT

#### 7.1 Trust signals / accreditations claimed (verbatim where possible)
- **£5,000 security guarantee** — everywhere (header CTA "Activate guarantee", hero "Get your £5000 guarantee", configurator bullets). Guarantee page: "Your Ultion lock is protected by our £5000 security guarantee for **5 years**." Handles: "£5,000 security guarantee when paired with an Ultion Lock." Nuki: "carries a £5000 security guarantee". Also `/keycard-activate-5k/` and `/keycard-activate-2k/` (a £2k tier exists — product unverified).
- **Sold Secure Diamond** — "Approved by locksmiths. Sold Secure Diamond. Few locks survive the test designed with the Master Locksmith Association and carried out by locksmiths." (img `home-ssd.jpg`)
- **Secured by Design / Police Preferred Specification** — "The official UK Police flagship initiative combining the principles of 'designing out crime' with physical security." (img `home-sbd.jpg`, `keys-sbd.png`)
- **BSI Kitemark TS007 3-star Grade 6** — "Approved by British Standards. Kitemark is the standard of excellence recognised around the world. Ultion is accredited with the highest Grade 6 3-star rating." (img `home-bsi.jpg`); configurator tags "TS 007 Certified", "Anti-Snap"; Nuki "BSI Kitemark for Internet of Things" (blog), "highest AV-TEST available (level 3)".
- **Scale:** "Ultion protects over **3 million British homes**" (section on most pages); cart bar "3 million+ homes use Ultion"; "the UK's industry-leading security brand".
- **Reviews:** "12500+ reviews" Trustpilot 4.5★ (static); "Why 8000 people rave about Ultion locks" (blog).
- **Durability claims:** "Tested for over 1,000,000 cycles" vs "100,000 needed to pass the TS007 durability cycle test"; "Molybdenum: 25% denser than iron"; "Double Lockdown Mode" ("A series of attack pins are engaged in Ultion's core when it detects an attack"); "The UK's thickest key" / "60% thicker key"; handles "six coats of corrosion protection… over 8000 hours in a weather test", "8x more durable than the rest", Sweet "30x more time than required for the flagship EN 1906:2012 corrosion standard", "20 years of protection" / "20-year anti-corrosion guarantee".
- **Key Control** — "a security protocol exclusive to Ultion customers that uses a unique 10-digit code to stop people copying your key without your authorisation" (free; verified via `/kcverified/`: "Every cutting request will now be sent to you for approval").
- **Fear/urgency stats:** "In 9 seconds you'll want to replace your lock"; "64% of burglaries happen when someone is at home"; "30%/34% of burglaries see homeowners coming face to face with the intruder"; "A burglary is committed every 40 seconds in the UK".
- **Insurance:** "The insurance approved padlock"; FAQ "Many insurance companies recognise TS007 3-star cylinders and may offer reduced premiums. Check with your insurer."; "Ultion 3 Star PLUS exceeds all UK insurance requirements."
- **Delivery:** live "Order today, delivers tomorrow" marquee; "Same day DPD dispatch" (`/ultion-locks/`, `/security-handle/`); "Delivered Next Day" (keys title); customer quotes citing DPD next-day.
- **Corporate:** Brisant Secure Ltd (Company 07880349, VAT 126249518), Allegion parent logo, Dewsbury address, phone numbers (0115 784 3162 sales; 0115 671 4033 / 0115 671 2567 / 0115 697 4265 for specific flows), opening hours "Mon-Fri (8am-6.30pm), Saturday (9am-4.30pm), and Sunday (10am-3.30pm)", email ultion.help@allegion.com; PTSI compliance statements page (UK Product Security regime for the Nuki).
- **Partnerships:** "We've partnered with Apple… Siri and 'Find My'" (KeyTag "Works with Apple Find My" badge), Nuki ("Europe's leading supplier of smart locks"), smart-home logos (HomeKit, Google Home, Alexa).
- **"As seen on" media:** only an image `nuki-as-seen-in.jpg` (alt "As Seen In") on the Nuki product page; no media names in text — **unverified**. No Which?/BBC/press mentions found in HTML text. Blog: "Former Scotland Yard detective Peter Bleksley" guide.
- **Accessibility/inclusion:** "Ultion Long Lever — With full DDA-compliance"; blog "making-home-accessible".

#### 7.2 Content pages (one line each)
- `/home-truths/` — Burglary-statistics storytelling (64%/30%/9-seconds), "How secure is your area?" postcode+radius search form (`#secure_search`, fields `location`, `radius`), "Meet the people behind Ultion" (founder Steve Stewart, garage 2011), development milestones timeline, "Success Stories" (customer break-in videos).
- `/ultion-locks/` — 3 Star PLUS landing: hero "The Ultion 3… comes complete with a £5,000 guarantee" + "Get Price", Trustpilot slider, Molybdenum/Lockdown Mode/As safe as houses, 9-second quote, "Meet the family", long **FAQ** (certification, police, insurance, comparison), "Same day DPD dispatch" CTA.
- `/ultion-nuki-2025/` — Nuki landing: "Our best smart lock ever.", "From box to door in 4 minutes." (Installation Guide 34s video), auto-unlock, USB-C rechargeable, "The reviews are in.", handle options, "Which Ultion Nuki?" comparison (Nuki vs Nuki Go), FAQs.
- `/security-handle/` — Handles landing with **"View in AR"** (`/security-handle/ar/`), "Watch a Master Locksmith attempt to break through an Ultion 2 Star Handle", range cards "from £27"/"from £56", molybdenum/weather/durability claims, feature overview table.
- `/ultion-sweet/` — Door-furniture range (letterplate from £24.90, knocker £9.90, handles £10.90, numerals £8.90, escutcheons, patio £40, blanking plates £25), 7 finishes, 8000-hour salt test, numerals preview inputs.
- `/ultion-bolt/` — Multipoint lock explainer ("Lock without the lift", four 20mm bolts, Nuki transmitter pocket; sold via installers — CTA "Buy the Ultion Nuki transmitter here").
- `/ultion-accessories/` — Accessory overview (KeyTag, KeyLight, KeyCap, glow-in-dark KeyCap, Lubricant "Wet oils or conventional WD40 will jam your lock", Padlock) + range cross-links.
- `/keyed-alike/` — "The only key you'll ever need": fit in 60 seconds video, comparison table Non-Ultion 3★ vs Ultion 3 PLUS (100,000 vs 1,000,000+ cycles, zinc vs molybdenum, thin vs 60% thicker key, Double LockDown, free Key Control), accreditation trio, guarantee CTA.
- `/guarantee-registration/` — "Activate your protection." form POST → `/landing/registration/installer-code/`: name, email, up to 5 keycodes ("Where can I find this?"), radio "I had a new door & lock installed / I had a new lock installed", reCAPTCHA; "Why register?" (Key Control, £5000 for 5 years, free); privacy note "we don't share your data… DotDigital" (email platform).
- `/landing/registration/` (post-registration) — "Registration Complete… registered your lock for Key Control" + upsell grid (Lubricant £12.95, Security Handle from £27, KeyTag £39, KeyCap £9.95).
- `/contact/` — "Talk to an expert." phone 0115 6714033 with hours, **request-a-callback form** (`#callback_form`: name, phone, time slot, reCAPTCHA, hidden `contact_token`/`form_token` — custom `ultion-callhandler` plugin), email, Trustpilot quotes.
- `/news-blog/` — paginated blog (7 pages), "Recent articles" + "Articles on Ultion" / "Articles on Crime" rails.
- `/terms/` — Full consumer T&Cs (Brisant Secure Ltd, VAT, contract formation…). `/webuse/` — website terms. `/privacy/` — privacy policy + "Submit DSR". `/cookies/` — OneTrust settings only.
- `/find-my-ultion/` — device-gated page ("Sorry your device is not supported" on desktop; Apple Find My deep-link flow — **unverified**).
- `/get-keys/order-lock/`, `/order-lubricant/`, `/customer-page/` — mostly empty/"Page Not Found" shells (funnel remnants).

---

### 8. CHECKOUT CLUES (static, anonymous)

- `GET /checkout/` → **302 to `/cart/`** when the cart is empty (Woo default). `/cart/` (226,268 B, title "Cart - Ultion Lock") renders a **custom theme template**: trust strip "**3 million+ homes use Ultion · £5,000 security guarantee · 12500+ reviews**" (repeated top and bottom), "Your cart is currently empty." + "Return to homepage", and a 10-quote review slider "Based on 12500+ reviews". No coupon form or cross-sells shown in the empty state; `data-block-name="woocommerce/mini-cart"` is the only block on the page (cart/checkout themselves are **WooCommerce Blocks**: `wc-cart-checkout-base-frontend.js`, `blocks-checkout.js`, `wc-stripe upe-blocks.css`, `woocommerce-product-bundles checkout-blocks`).
- Checkout fields (from `wcSettings.defaultFields`): email (req) · country (req) · first/last name (req) · company (opt) · address 1 (req) · address 2 (opt) · town/city (req) · state/county (req) · postcode (req) · phone (**optional**). `addressFieldsLocations.contact = [email]`. No custom checkout fields (`custom_checkout_fields: []`). Store "My account" page id 0 → **no customer accounts / guest checkout only (unverified)**.
- Payment gateways (HTML config): **Credit / Debit Card (Stripe UPE, Optimized Checkout accordion)**, **PayPal**, **Klarna** ("Pay with Klarna"); Stripe **Express Checkout Element enabled** → Apple Pay / Google Pay express buttons on cart/checkout and product pages (`shouldShowExpressCheckoutButton: true`). Link, Amazon Pay disabled.
- Prices displayed **inclusive of tax** (`displayCartPricesIncludingTax: true`); `shippingCostRequiresAddress: false`; shipping countries GB, IE, FR, GG, JE; shipping classes `standard` / `paid`.
- Behaviour flags: `cartRedirectAfterAdd: true` (Add to Basket → cart page); configurator bypasses cart and lands on checkout; Store API cart endpoint open (`/wp-json/wc/store/v1/cart`).
- Custom order statuses visible in config: "Awaiting Customer Response", "Customer Response", "**Smart / Nuki Order Processed**" (keycode verification workflow).
- Nothing was submitted; checkout form HTML with items in cart was not fetched.

---

### Top 15 things Ultion does that a competitor should learn from

1. **Sell the cylinder through a guided configurator, not a 131-option dropdown.** `/get-locks/product/` uses Alpine.js: Key/Thumbturn → colour → internal/external size (dependent selects, default 35/35 with "Composite doors are usually 35mm and 35mm" + measuring-guide modal) → live price via AJAX → multi-lock basket → straight to checkout. The ugly backing product (`/product/3-star-lock/`, 1.2 MB, 87-value size dropdown) is noindexed and hidden.
2. **Keycode as the universal product key.** One input (`e.g XUIHF2335`, regex-validated, prefix-aware routing to phone sales for U/A/C series) powers keyed-alike locks ("to code" SKUs), key re-orders, KeyTag, Nuki add-ons and guarantee registration. Build keyed-alike into the data model from day one.
3. **Keys are a first-class product and the #1 nav item.** "Get Keys" is first in the header, "Get Ultion Keys" first in the footer, a sticky "Looking to buy extra keys?" bar on every page, and a dedicated 2-step flow (qty 1–6 + keycode → priced options with free KeyCaps, trackable key and lubricant upsells). Repeat-purchase keys/accessories are the retention engine.
4. **Guarantee activation as a top-level CTA.** "Activate guarantee" button in header, hero box, dedicated section, post-registration upsell page — turning warranty registration into lead capture (email, keycodes, installer code) and a Key Control opt-in.
5. **Live delivery promise everywhere.** AJAX `delivery_date_notice` → "Order today, delivers tomorrow" in a sticky scrolling marquee on product/configurator pages plus per-line "Delivers [date]" on the keys order step; reinforced by "Same day DPD dispatch".
6. **Trust strip pattern repeated on every template** ("Trustpilot ★★★★½ 12500+ reviews · Are you an installer? Click Here"), and a dedicated trust strip on the (even empty) cart: "3 million+ homes · £5,000 guarantee · 12500+ reviews". Cheap, consistent, high-frequency.
7. **Quantified security storytelling**: 9 seconds, 64% at home, 1,000,000 vs 100,000 cycles, 60% thicker key, molybdenum 25% denser than iron, Double Lockdown Mode, 8000-hour salt spray — every claim has a number and a comparison table (keyed-alike page: "Non-Ultion 3 lock vs Ultion 3 PLUS").
8. **Accreditation trio with plain-English explanations** (Sold Secure Diamond / Secured by Design / BSI Kitemark) + insurance FAQ ("may offer reduced premiums… Check with your insurer") — speaks to homeowners, not just locksmiths.
9. **Mega-menu as a merchandised shelf**: image cards with "Popular"/"New for 2025" tags, one-line benefit, and dual CTAs (Buy Online vs Explore), with deep links that **pre-select variation attributes via query string** (e.g. 2 Star PLUS, Above Handle, Lever, White).
10. **Add-on bundling on the smart lock PDP**: required image-checkbox group (Fob +£49, Fingerprint Keypad +£145, Auto-Lock Sensor +£55) with running grand total and "Add-ons Explained" lightbox — attach-rate engineering built into the page rather than a separate accessories page.
11. **Mini-cart "Don't Forget" upsell**: Lock Lubricant £12.95 with "Apply every 6 months to maintain guarantees" and a one-click Quick Add — a consumable tied to the guarantee.
12. **Phone/callback as a conversion path, not a fallback**: "Chat with a Specialist", "Want to speak to an expert? Call us on…", request-a-callback forms with time-slot picker (custom `ultion-callhandler` plugin), and a mandatory keycode-confirmation call for key orders framed as a security feature ("This call typically takes less than two minutes").
13. **Separate B2C and trade**: "Are you an installer? Click Here" → brisant-secure.com on every page; white-label keys catalogue for OEM brands; consumer site stays uncluttered.
14. **Rich FAQ accordions on PDPs and landing pages** (15 Nuki questions incl. "What's to stop someone shouting 'Alexa, unlock my door' through the letterbox?"; 8 KeyTag; long 3* PLUS FAQ) — answers objection by objection and is FAQ-schema-ready (they don't emit FAQ schema — an easy win to beat them).
15. **Avoid their weaknesses**: generic titles ("Home - Ultion Lock"), no meta descriptions, no `<h1>` on home, 4.8 MB of JS/CSS (2.2 MB theme CSS, 520 KB Klarna SDK and React cart bundles on every page), 8.9 MB of autoplay MP4 on the homepage, static (non-live) Trustpilot assets with no Review schema, four overlapping add-on plugins, 42 hidden/duplicate SKUs and an operational category taxonomy leaking into the sitemap. A lean rebuild with real review schema, FAQ schema, proper titles/descriptions and a sub-1 MB page can out-rank and out-perform them while borrowing the UX patterns above.

