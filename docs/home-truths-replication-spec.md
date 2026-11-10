# Home Truths page replication spec — Ultion /home-truths/ → WD /home-truths

Captured 10 Nov 2026 (desktop 1366 px, page text + section DOM + theme scripts).

## Ultion page anatomy

| # | Section (class) | What it is |
|---|---|---|
| 1 | `section-hometruths-banner` | Dark (#2a2a2a) full-height banner, hooded-figure photo right; eyebrow "The world we live in"; "Home **truths**" (orange word); intro paragraph with the 64 % / 30 % / 9-second claims; down arrow |
| 2 | `section-hometruths-slider` | Slick slider, 6 slides: giant "THE WORLD WE LIVE IN / THE TRUTH" title slide, then five stat slides (64 % at home · 34 % face to face · 9 seconds · 12 PM & 4 PM · 76 % through a door), each with photo background, giant figure, claim, sub-heading, paragraph; dots + arrows |
| 3 | `section-area-crime` | "How **secure** is your area?" postcode crime checker: postcode input + Search, "Use my location", Google map, 1 mile / 3 miles radios, markers from Police data for the past 6 months (fetched through a WordPress AJAX proxy) |
| 4 | `section-ultion-quote` | Founder quote with portrait (Steve Stewart) |
| 5 | `section-hometruths-milestones` | Horizontal timeline 2011 → 2022 |
| 6 | `section-hometruths-quotes` | "Success Stories": one customer quote with portrait |
| — | footer | shared |

No `<h1>` on the page (headings are h2/h3). Title "Home Truths - Ultion Lock".

## What we can and cannot copy

- Ultion's figures are unsourced on the page. Ours come from the ONS Crime Survey for England and Wales, *Nature of crime:
  burglary* tables, year ending March 2025 (published 2025, downloaded 10 Nov 2026), so every number has a source line.
- The "9 seconds" lock-snapping claim is Ultion's own test; Watchdog has no equivalent timed test, so it is replaced by the
  ALPS truth (the cam locks the instant the key is removed).
- Founder quote, development milestones and the customer success story are brand-specific. Watchdog has no verified
  founder story or customer quotes yet (reviews source pending), so those become a "Who's behind Watchdog" panel built
  only from verifiable facts, plus the existing accreditation and guarantee sections.
- Hooded-figure lifestyle photo: asset gap (listed in the homepage spec). The banner uses the Watchdog X-ray render.

## Watchdog version

| Section | Build |
|---|---|
| Banner | Near-black full-bleed; eyebrow "The world we live in"; H1 "Home **truths**" (red word); intro paragraph using our sourced figures; X-ray render right; scroll arrow |
| Truths slider | Horizontal snap carousel, title slide "THE WORLD WE LIVE IN / THE TRUTH" in giant condensed red/grey type, then 5 stat slides with giant red figure, claim, sub-heading, paragraph and source footnote: 63 % someone at home · 77 % entered through a door · 59 % at the front · 74 % evening or night · 25 % door not locked / 15 % forced lock. Arrows + dots, keyboard and reduced-motion aware |
| Crime checker | "How **secure** is your area?": postcode (POSTed to our API, not in the URL) or browser location; 1 mile / 3 miles; results for the latest 6 months from data.police.uk (Open Government Licence): total incidents, burglaries highlighted, top categories as bars, month-by-month bars, embedded OpenStreetMap centred on the search (no Google key needed) |
| Who's behind Watchdog | Dark statement panel with the wdlocks.co.uk line "Tested by locksmiths, trusted by homeowners" and three fact tiles: made by Brisant Secure (Dewsbury, part of Allegion since Aug 2025), fitted by Watchdog Locksmiths London (10+ years), tested to Kitemark 3★ / Sold Secure Diamond / Secured by Design |
| Accreditations + Guarantee | Reuse the homepage sections |
| Success stories | Skipped until a verified reviews source exists |
| Navigation | "Reviews" (pointing at a removed section) → "Home truths" in the header, mobile menu, Keys & Aftercare "more" links and footer; homepage Home Truths "Learn more" → /home-truths; sitemap entry |

## Sources

- ONS, Nature of crime: burglary, year ending March 2025 — Table 10a (someone at home 63.3 %), Table 3b (door 76.9 %,
  door not locked 24.5 %, forced lock 14.9 %, window 19.8 %), Table 2a (front 60.5 %) / 2b (front 58.8 % with entry),
  Table 1b (evening/night 73.6 %). https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/natureofcrimeburglary
- data.police.uk API: `crimes-street-dates` (latest month), `crimes-street/all-crime?lat&lng&date` (1 mile) and `?poly=` (3 miles).
- Allegion acquires Brisant Secure, 13 Aug 2025: https://www.allegion.com/corp/en/news/year/2025/brisant-announcement.html
- Watchdog brochure published by Brisant Secure: https://issuu.com/brisant-secure/docs/watchdog_brochure_2025-2
- wdlocks.co.uk/about ("over 10 years of experience", Watchdog Locksmiths).
