# Homepage replication spec — Ultion → WD Locks

Captured 10 Nov 2026 at 1366 px and 375 px from https://www.ultion-lock.co.uk/. Goal: reproduce the structure, order and
behaviour of Ultion's homepage for wdlocks.co.uk in Watchdog branding (black header/footer, Watchdog red where Ultion uses
orange `#F2712F`, cream canvas instead of Ultion's white/grey — decision 10 Nov). Font: Ultion uses Sofia Pro; we keep Inter +
Playfair for headings unless the client wants a closer match (Sofia Pro is a paid Adobe font; nearest free: Figtree / Outfit).

Global facts: header 112 px tall, black `#090909`, logo left, nav right (Get Keys · Locks ▾ · Handles ▾ · Accessories ▾ ·
Talk to us · [Activate guarantee] outline button · basket). Mega-menus open on hover with 3 dark product cards (photo at 15 %
opacity brightening on hover, POPULAR badge, "Buy Online" + "Explore") and a "More Products" text column. Orange utility bar
under the header: "Looking to buy extra keys? Click here". Mobile: logo + basket + burger; utility bar stays.

## Section-by-section (Ultion → Watchdog)

| # | Ultion section (class) | What it is | Behaviour | Watchdog version | Assets | Status |
|---|---|---|---|---|---|---|
| 0 | `sticky-bar-container` | Orange utility bar "Looking to buy extra keys? Click here" | Sticky under header | Red bar, same copy → /products/watchdog-3-star-alps-extra-keys | — | **Have** (AnnouncementBar; make it sticky under header and always the keys message on home) |
| 1 | `section-home-banner` | Full-bleed hero: 15 s muted looping video of a door, dark overlay; eyebrow "Ultion Lock Protection", H2 "In **9 seconds** you'll want to replace your lock", buttons [Get an Ultion Lock] [▶ Watch full video (1:18s)], floating card right "Get your £5000 guarantee → Activate Now", down-arrow | Video autoplay muted loop playsinline; "Watch full video" opens Vimeo lightbox | Headline "A snapped lock takes **seconds**. A Watchdog doesn't." (keep ours) or Ultion-style "In 9 seconds…"; buttons [Get a Watchdog lock] [▶ Watch full video (0:40)] → explainer; guarantee card already exists | **Missing: a door/lock lifestyle video or photo for the background.** Fallback: dark panel with the turntable loop (have) | Build (new layout), asset gap |
| 2 | `section-home-trustpilot-bar` | Thin black bar: Trustpilot logo + 4.5 stars + "12500+ reviews" · right "Are you an installer? Click Here" | Static | Thin bar: Checkatrade/accreditations + "Are you an installer? Apply for trade →". Reviews pending client source | TRUST_SIGNALS | **Have** (TrustStrip; restyle as thin dark bar) |
| 3 | `section-home-title-banner` | Centered pill "OUR PRODUCTS", H2 "Find the right protection for you", one-line intro | Static | Same, Watchdog copy | — | **Have** (products heading; restyle centered + pill) |
| 4 | `section-home-products` | 8 product cards in 4×2 grid: photo, H3, one-liner, orange "Buy Now" | Static, hover lift | Our 9 catalogue products, same card anatomy, red "Buy now" | Store API photos | **Have** (ProductGrid; switch card to Ultion anatomy: centred text + full-width button) |
| 5 | `section-home-protection` | Dark section: H2 "The **very best** protection for British homes" + Learn more; right: 2 s exploded-lock video that plays once when scrolled into view | Plays once in view, no loop | H2 "The **very best** protection for British homes" (generic claim, keep) → /#why-watchdog; right: **Watchdog exploded view** | **Missing: Watchdog exploded render/animation** (only the Ultion one exists). Fallback: X-ray render (have) | Build; asset gap |
| 6 | `section-home-intro` | Centered H2 "Fitting the highest security protection is the key" + one paragraph | Static | Same message in WD words | — | Build (simple) |
| 7 | `section-home-truths` | Dark full-bleed photo (hooded figure), eyebrow "Home Truths", huge "64%" + "of burglaries happen when someone is at home", Learn more → /home-truths/ | Static | Keep our Home Truths facts, restyle to one giant stat + photo; stat must be a sourced claim (e.g. ONS). | **Missing: lifestyle/crime photo** (stock or client) | Build; asset gap |
| 8 | `section-home-buy-locks-keys` | Orange band: "Buy more Ultion locks and keys here", copy, [Buy keys here] [Buy locks here], keys photo bleeding right | Static | Red band, "Buy more Watchdog locks and keys here", links to keys and cylinder pages, engraved-keys render | keysEngraved (have) | Build |
| 9 | `section-home-bolt-multipoint` | Dark: Ultion Bolt multipoint + Nuki transmitter | Static | **No Watchdog equivalent product** — omit | — | Skip (no product) |
| 10 | `section-home-nuki` | Dark: Ultion × Nuki smart lock | Static | **No Watchdog equivalent** — omit (or "Coming soon" if client plans one) | — | Skip |
| 11 | `section-thickest-key` | Dark: "The UK's **thickest** key", copy, [Buy more keys], giant key photo | Static | "The Watchdog key" — dimple + snake key, cut to your key number; [Buy more keys]; key render | keySingle / Watchdog-key3 (have) | Build |
| 12 | `section-one-key` | Light: "One key for **all** locks", copy, Learn more → /keyed-alike/; right: 11.6 s muted loop of keys merging | Autoplay muted loop | Same for our Keyed-Alike service → /products/watchdog-keyed-a-like | **Missing: Watchdog keyed-alike clip** (Ultion one exists). Fallback: key turntable (have) | Build; asset gap |
| 13 | `section-home-keytag` | Dark: KeyTag / Apple Find My with video | Autoplay muted | **No Watchdog equivalent** — omit | — | Skip |
| 14 | `section-security-promise` | Light: Vimeo "Ultion Key Control" (click-to-play) left; H2 "Key security promise by Ultion", copy, [Activate key control] | Vimeo embed | "Key security promise by Watchdog": key-copy protection via key number; [Activate guarantee]; left: inside-the-lock film or keys clip | insideFilm (have) | Build |
| 15 | `section-activate-guarantee` | Dark: pill "PROTECTED BY ULTION", H2 "Register your **£5,000** guarantee.", copy, [Activate £5000 Guarantee], tag photo right | Static | Same, Watchdog tag render | guaranteeKeytag (have) | **Have** (Guarantee section; restyle dark + tag large) |
| 16 | `section-ultion-action` | "See **Ultion** in action" slick carousel of 6 Vimeo cards (CCTV/story), arrows, duration, "Watch full video" | Lightbox | Built today with our 4 films; add arrows when > 4 | 4 films (have); **customer/CCTV stories missing** | **Have** |
| 17 | `section-ultion-accreditations` | Light: 3 stacked blocks — Sold Secure Diamond, Secured by Design, BSI Kitemark (TS007-1 KM657241) with H3 + paragraph each | Static | Same three, Watchdog licence KM597142 | badges (have) | Build (we have tiles; restyle as 3 explainers) |
| 18 | `section-home-sweet` | Door furniture range promo with photo | Static | **No equivalent** — omit, or promote Bruno Teddy car-key signal blocker | product photo | Skip / optional |
| F | footer | Black: 6 link columns (Popular with 2 orange buttons, Locks, Handles, Accessories, Furniture, Support), phone pill, Trustpilot, address, socials, legal, "THE HOME OF HOME SECURITY", Allegion logo | Static | Black footer (have); add "Popular" column with [Get Watchdog keys] [Activate guarantee] buttons, tagline "Stays locked.", Brisant Secure "powered by" mark | — | Have; extend |

## Proposed Watchdog homepage order

1. Utility bar (red) · 2. Hero (video/dark) · 3. Thin accreditation bar · 4. "Find the right protection for you" + 9 product
cards · 5. "The very best protection for British homes" (dark, exploded/X-ray) · 6. "Fitting the highest security protection
is the key" · 7. Home Truths (giant stat) · 8. Red band "Buy more Watchdog locks and keys" · 9. "The Watchdog key" (dark) ·
10. "One key for all locks" (keyed-alike) · 11. Key security promise · 12. Register your £5,000 guarantee (dark) ·
13. See Watchdog in action · 14. Accreditation explainers · 15. Footer.

Our existing "Every angle" turntable and "Inside the lock" inline sections fold into 5 and 11 respectively.

## Asset gaps to request from the client / Allegion

1. Hero background video or photo (a door being approached / lock close-up; Ultion's is 15 s).
2. Watchdog exploded-view render or 2 s animation (for section 5).
3. Watchdog keyed-alike "keys merge" clip (for section 10).
4. A lifestyle / crime photo for Home Truths (stock is acceptable).
5. Customer story or CCTV footage for the action bar (optional).
6. Confirm the headline stat for Home Truths with a source.

## Interactions to reproduce

- Hover mega-menus (have), hover-brighten product photos (have), sticky header + utility bar.
- Hero video: autoplay muted loop; "Watch full video" opens the dark player (VideoBar modal).
- Section 5 video plays once on entering view (use useInViewPlayback without loop).
- Carousel arrows on the action bar when cards exceed the row.
- Mobile: single column, full-width buttons, hero copy over the video, products stacked with centred text.
