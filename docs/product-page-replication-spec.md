# Product page replication spec — Ultion /get-locks/product/ → WD cylinder page

Captured 10 Nov 2026 at 1366 px and 375 px. Ultion sells the lock through a configurator rather than a WooCommerce
product template; the page below it is a marketing scroll. Our page keeps live WooCommerce data (variations, prices, stock)
and the proxied basket, and adopts Ultion's anatomy and order.

| # | Ultion element | Behaviour | Watchdog version | Status |
|---|---|---|---|---|
| 1 | Gallery left: large image that swaps with the selection (key/thumbturn × colour), thumbnails, "3 STAR SECURITY" badge | Image changes on option change | Gallery with store photos + Allegion renders, 3★ badge overlay | Have + badge |
| 2 | Pills "TS 007 CERTIFIED" · "ANTI-SNAP"; H1; price (£63) | Static | Pills "TS 007 3★ certified" · "Anti-snap"; H1; price from Store API | Build |
| 3 | 6 bullet benefits (guarantee, Sold Secure, SBD, molybdenum core, thicker key, Key Control) | Static | 6 Watchdog facts (guarantee, Sold Secure Diamond, SBD, 11 pins, ALPS, key-number cutting) | Build |
| 4 | "Enter keycode to use existing key with this lock (Learn more)" | Text input | Omitted on the lock page — our keyed-alike service and extra keys carry the key number; see Keyed-alike toggle | Skip (documented) |
| 5 | Panel: "This lock includes 3 keys as standard" + extra keys stepper | Adds keys | "Includes 3 keys" + link to extra keys (key-number product is ordered on wdlocks.co.uk) | Build |
| 6 | Internal control: Key operated / Thumbturn radios | Changes product + image | Two radio-styled links: Key operated (this page) / Thumb turn (thumb-turn product, carrying the chosen size) | Build |
| 7 | Colour swatches (dual / chrome / brass) | Changes image | Cylinder: finish chip "Satin nickel"; rim cylinder: brass / nickel swatches (existing) | Build |
| 8 | Internal size / External size selects (10–75 mm) + "Composite doors are usually 35mm and 35mm. View lock measuring guide" | Validates combo | Two selects driven by the 17 real variations (outside list filters by inside), same hint, measuring diagram | Build |
| 9 | [Add another lock] outline · [Checkout Now] filled | Multi-lock basket then straight to checkout | [Add to basket] outline · [Checkout now] filled (adds, then hands the single line to the WooCommerce checkout; multi-line needs the handoff plugin) | Build |
| 10 | Sticky bottom bar "TOTAL £63 · QTY 1 LOCK · [Checkout Now]" once the configurator scrolls away | Fixed bar | Same, with live total incl. keyed-alike | Build |
| 11 | Trustpilot review slider | Static quotes | Skipped until a verified reviews source exists | Pending |
| 12 | Dark "Molybdenum: 25% denser than iron… tested 1,000,000 cycles" | Static | Dark "ALPS. Always locked." with the ALPS cam clip and the 11-pin / anti-drill facts | Build |
| 13 | Yellow "Entering Lockdown Mode" + "See how it works" | Opens video lightbox | Red "Anti-snap, by design" with the engraving render; "See how it works" scrolls to the inline film | Build |
| 14 | "As safe as houses" 6 feature tiles with small video links | Static | 6 tiles from existing renders: Anti-everything, £5,000 guarantee, Cut to your key number, The Watchdog key, Quick easy installation, Every body approves | Build |
| 15 | Dark "Ultion protects over 3 million British homes" CTA | Static | Dark "Fitted by locksmiths across the UK" + [Get the 3 Star lock] → #sizing (no unverified numbers) | Build |
| 16 | "Order today, delivers tomorrow" marquee + footer | Static | Delivery promise strip (existing) | Have |

Kept from our page because it adds value Ultion lacks: the inline explainer with chapters ("See it work"), the
WooCommerce description accordion with the film, the FAQ with schema, the delivery estimate with the 3pm cut-off.
