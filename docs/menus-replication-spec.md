# Menus replication spec — Ultion → WD Locks

Captured 10 Nov 2026 (desktop 1366 px hover on "Locks"; mobile 375 px `.mobile-navigation` DOM).

## Desktop mega-menu (Ultion)

- Opens on hover under the black header; panel is dark (header black continues, `#090909` → cards on `#111`), no border.
- Three product cards (`.product.medium`, radius 10 px, transparent bg): full-bleed product photo at **opacity 0.2, grayscale 30 %**,
  brightening on hover; "POPULAR" orange pill top-right; H3 23 px white; one-liner 14.5 px `#c1c1c1`; two buttons 14 px, radius
  4 px: **Buy Online** (filled orange, white text) and **Explore** (outline orange).
- Right column "More Products" in yellow (`#fecb3e`) 23 px with white 16 px text links.
- Thin Trustpilot strip beneath the panel.

## Mobile menu (Ultion)

- Full-screen black (`#090909`) panel from the burger.
- Top level 32 px white: Keys · Locks · Handles · Accessories · Home Truths · Contact. Groups expand to sub-items 22 px white
  each with orange 16 px "Explore" / "Buy Online" links.
- "MOST VIEWED" block: Get More Keys · Activate My Guarantee · Ultion Nuki Go · Ultion 3 PLUS Lock · Buy Lock Lubricant.
- Sticky "Activate Guarantee" button at the bottom.

## Watchdog version

| Element | Build |
|---|---|
| Mega-menu panel | Dark `#1b1a1c` panel under the black header; cards on `#111013`, radius 10 px, photo at 20 % opacity / 30 % grayscale → 70 % colour on hover; POPULAR red pill; white title, muted one-liner, price; **Buy online** filled red + **Explore** outline red (4 px radius); "More products" column in red with white links; dark accreditation strip |
| Mobile menu | Full-screen black panel, light logo; top level 2xl white (Locks ▾, Keys & Aftercare ▾, Why Watchdog, Reviews, Contact); expanded groups list sub-products 20 px white with red "Explore" / "Buy online"; MOST VIEWED block; phone + email; sticky red "Activate £5,000 guarantee" |

Skipped: Trustpilot strip (no verified source), Handles/Accessories groups (no Watchdog products).
