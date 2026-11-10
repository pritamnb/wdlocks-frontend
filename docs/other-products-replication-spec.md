# Remaining product pages — Ultion standard product template → WD

Captured 10 Nov 2026 from /product/ultion-lock-lubricant/ and /keyed-alike/.

## Ultion standard product page anatomy

1. Gallery left (WooThumbs), "Want to speak to an expert? Call us" badge under it.
2. H1, **H2 subtitle** ("Stops key jamming + protects guarantees"), price, badge pill ("Improved packaging, easier application"),
   "Free next-day delivery", intro paragraph, bullets, option radios with prices (Pack size 1/2/3), Add to Basket, Apple Pay /
   Google Pay.
3. Trustpilot + installer bar.
4. Three feature tiles, each: eyebrow (SIMPLE AND EFFECTIVE) · H3 · body · image.
5. FAQs accordion ("QUESTIONS?").
6. Dark closer "Ultion protects over 3 million British homes" + Upgrade Your Locks.

## Keyed-alike page anatomy

Dark hero "The only key you'll ever need" · "Fitting a lock in 60 seconds" with video · three "3 PLUS" features · "One key for
all locks" graphic (Front door + Back door + Mum's door + Shed door = 1 key) · comparison table · accreditations · guarantee.

## Watchdog mapping

| Product | Type | Treatment |
|---|---|---|
| Thumb turn (5077) | variable, sizes | Already on the lock configurator + lock feature sections |
| Rim cylinder (5112) | variable, brass / nickel | Pills + subtitle + bullets; colour swatches (existing); three feature tiles; FAQ; closer |
| Half cylinder (3861) | simple | Pills + subtitle + bullets; three tiles; FAQ; closer |
| Keyed-alike service (5642) | simple | Pills + subtitle + bullets; "One key for all locks" doors graphic; three tiles; closer |
| Lock lubricant (4384) | simple | Pills + subtitle + bullets; three tiles (stops jamming · protects guarantee · smooth operator); FAQ; closer |
| Bruno Teddy signal blocker (5565) | simple | Pills + subtitle + bullets; three tiles; FAQ; closer |

All content lives in `PRODUCT_CONTENT` in constants.ts so the client can edit copy without touching components.
Skipped: Trustpilot bar and review sliders (no verified source); Apple/Google Pay buttons (payment is on wdlocks.co.uk).
