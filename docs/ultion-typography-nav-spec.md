# Ultion typography + header/nav spec (measured 2026-11-11)

Source: https://www.ultion-lock.co.uk/ (home), /product/ultion-nuki-2025/ (product), /get-locks/product/ (shop).
Measured with headless Chromium (Playwright 1.65) at 1440x900, 1920x1080 and 390x844 (iPhone UA, DPR 3), after
dismissing the OneTrust banner ("Reject All") and the VWO "Welcome to Ultion" audience modal. Values are from
`getComputedStyle` / `getBoundingClientRect`, cross-checked against the theme stylesheet
(`/app/themes/consultancy/css/style.min.css`). Scripts and raw JSON live in
`/private/tmp/claude-501/-Users-pritam--claude-spares-spare-Z1Xpbz/30ed1f34-b404-4477-93b7-533c3f941c7c/scratchpad/ultion-measure/`
(`measure.js`, `fontmetrics.js`, `data-*.json`, `hover-*.json`, `fontmetrics.json`).

## A. Fonts

### A1. What Ultion loads

All webfonts come from Adobe Fonts (Typekit) kit `https://use.typekit.net/vtc6oqu.css`, domain-locked, served as
woff2 + woff + opentype with `font-display: swap`:

| Family (CSS name) | Real name / foundry | Faces declared in kit | Faces actually fetched on home |
|---|---|---|---|
| `sofia-pro` | Sofia Pro, Olivier Gourvat / Mostardesign (2009; "Sofia Pro 2025" variable expansion exists) | 300, 300i, 400, 400i, 500, 600, 600i, 700, 900 | n3, n4, n5, n6, n7 (5 files) |
| `alternate-gothic-no-2-d` | Alternate Gothic No.2 D (URW) | 400 | n4 (used only for the giant "Home Truths" numerals, 190-360px) |

Also declared but never loaded on the pages measured: Font Awesome 5 Pro, FontAwesomePB, dashicons.
Body stack: `font-family: sofia-pro, sans-serif; font-weight: 300; font-size: 16px; line-height: 1.15` (html).

Confirmed: the brand font is **Sofia Pro by Mostardesign** (geometric sans with humanist warmth, often described
as a Futura heir with open apertures). Licence: it is included in Adobe Fonts for Creative Cloud subscribers
(web use via the Typekit kit only). Self-hosting the web files, app embedding and volume licensing need a separate
paid licence from Mostardesign; MyFonts sells the desktop family (18 styles, ~$249) with web licences priced
separately. **We must not copy the Typekit files** (they are domain-locked and licensed to Ultion only).

Sofia Pro metrics as rendered on Ultion (canvas `measureText`, em = 1): x-height **0.467**, cap-height **0.689**,
ascender (d) 0.721, descender (p) 0.227, width of a-z at 400 = 13.31 em, at 700 = 13.65 em.
Letterforms: double-storey `a`, single-storey `g`, flat-topped `t` with short crossbar, perfectly round `o/e/c`,
straight-tailed `y`, tight default tracking.

### A2. Computed styles (desktop 1440 unless noted; sofia-pro throughout)

| Element | size / weight | line-height | letter-spacing | transform | colour |
|---|---|---|---|---|---|
| body | 16px / 300 | 18.4px (1.15) | normal | none | #504e4e |
| paragraph in sections | 16px / 300-400 | 24px (1.5) | -0.32px (-0.02em) or -0.48px (-0.03em) | none | #090909 / #504e4e |
| product intro paragraph | 18px / 300 | 27px (1.5) | -0.54px (-0.03em) | none | #090909 |
| hero title (home, it is an h2) | 100px / 600 | 100px (1.0) | -4px (-0.04em) | none | #fff (accent words #f2712f) |
| hero eyebrow h3 | 26px / 400 | 28.6px (1.1) | -1.04px (-0.04em) | none | #f2712f |
| product h1 | 60px / 900 | 60px (1.0) | -2.4px (-0.04em) | none | #f2712f |
| section h2 | 100px / 700 (also 80/600, 90/700) | 110px (1.1) | -4px (-0.04em) | none | #090909 |
| product-page h2 | 34px / 600 | 34px (1.0) | -1.36px (-0.04em) | none | #504e4e |
| h3 (card title) | 30px / 500 | 33px (1.1) | -0.9px (-0.03em) | none | #090909 |
| nav link (1440) | 18px / 700 | 20.7px (1.15) | normal | none | #fff, hover #fecb3e |
| nav link (>=1480, e.g. 1920) | 20px / 700 | 23px | normal | none | #fff |
| header CTA "Activate guarantee" (1440) | 18px / 600 | 20.7px | -0.54px (-0.03em) | none | #f2712f on transparent, 1px #f2712f |
| header CTA (1920) | 20px / 600 | 23px | -0.6px | none | same |
| product card title (home grid) | 30px / 500 | 33px | -0.9px | none | #090909 |
| product card description | 16px / 300 | 24px | -0.32px | none | #000 |
| product price (product page `.woocommerce-Price-amount`) | 24px / 400 | 36px | normal | none | #090909 (20px on mobile) |
| primary button `.btn` | 22px / 500 | 25.3px (1.15) | -0.88px (-0.04em) | none | #fff on #f2712f |
| small button ("Checkout Now" inline) | 16px / 500 | normal | -0.64px (-0.04em) | none | #fff on #f2712f |
| mini-cart "Quick Add" | 14px / 500 | 16.1px | -0.28px (-0.02em) | none | #fff on #f2712f |
| footer column heading | 32px / 500 | 35.2px (1.1) | -0.96px (-0.03em) | none | #fecb3e |
| footer link | 18px / 300 | 28.8px (1.6) | -0.54px (-0.03em) | none | #fff |
| footer buttons | 22px / 500 | 35.2px | -0.88px | none | #fff on #f2712f / outline |
| mobile hero (390) | 40px / 600 | 40px | -1.6px (-0.04em) | none | #fff |
| mobile product h1 (390) | 38px / 900 | 38px | -1.52px | none | #f2712f |
| mobile section h2 (390) | 36.9px / 700 (clamp) | 40.6px | -1.47px | none | #090909 |
| mobile card h3 (390) | 24.2px / 500 (clamp) | 26.6px | -0.73px | none | #090909 |
| mobile button (390) | 16px / 500 | 18.4px | -0.64px | none | full-width, h 48px |

Rule of thumb: Ultion tracks **every** heading, button and link at **-0.03em to -0.04em**; body copy at -0.02em;
nothing is uppercase except tiny pills ("POPULAR" 8px/500 +0.72px). Heading line-height is 1.0 (hero) or 1.1.

### A3. Google Fonts replacement

Empirical comparison (same canvas method, Google Fonts loaded at 400 and 700; ratio = Sofia Pro / candidate):

| Candidate | x-height | cap-height | a-z width 400 / 700 | x-height ratio | width ratio 400 / 700 | wght axis | italics |
|---|---|---|---|---|---|---|---|
| **Outfit** | 0.475 | 0.694 | 12.91 / 13.54 | 98% | 103% / 101% | 100-900 var | no |
| Jost | 0.460 | 0.700 | 12.22 / 13.70 | 101% | 109% / 100% | 100-900 var | yes |
| **Figtree** | 0.500 | 0.700 | 13.18 / 13.72 | 93% | 101% / 99% | 300-900 var | yes |
| Albert Sans | 0.500 | 0.700 | 13.38 / 13.63 | 93% | 99% / 100% | 100-900 var | yes |
| Urbanist | 0.502 | 0.700 | 13.00 / 13.62 | 93% | 102% / 100% | 100-900 var | yes |
| Red Hat Display | 0.501 | 0.700 | 12.88 / 13.74 | 93% | 103% / 99% | 300-900 var | yes |
| DM Sans | 0.504 | 0.700 | 13.51 / 14.55 | 93% | 99% / 94% | 100-1000 var + opsz | yes |
| Plus Jakarta Sans | 0.536 | 0.745 | 14.02 / 14.59 | 87% | 95% / 94% | 200-800 var | yes |
| Manrope | 0.540 | 0.720 | 13.55 / 14.33 | 86% | 98% / 95% | 200-800 var | no |
| Lexend | 0.525 | 0.700 | 14.28 / 15.12 | 89% | 93% / 90% | 100-900 var | no |
| Sofia Sans | 0.488 | 0.655 | 12.64 / 12.92 | 96% | 105% / 106% | 1-1000 var | yes (different design: narrow grotesk by Lettersoup, not related) |
| Poppins | 0.548 | 0.697 | 14.59 / 15.48 | 85% | 91% / 88% | static 9 weights | yes (too wide, too tall x-height) |

Specimen sheet: `scratchpad/ultion-measure/specimen-google-candidates.png` vs `specimen-sofia-nav-ultion.png` /
`specimen-sofia-hero-ultion.png`.

**Recommendation: Outfit** (Rodrigo Fuenzalida, OFL, `next/font/google` variable `wght` 100-900).
Reasons: closest vertical metrics of the set (x-height 98%, cap-height 99%, ascender/descender within 0.01em), so
Ultion's px sizes and line-heights transfer 1:1; widths within 1-3%, so nav and button boxes stay the same size;
geometric construction matches Sofia Pro's letter shapes (double-storey `a`, single-storey `g`, round `o/e/c`,
flat `t`), and at 600-700 with -0.04em tracking the hero reads almost identically (see specimen row 1).
Caveats: no italics (Ultion barely uses them; use `font-synthesis: none` and avoid italics), and Outfit ships
discretionary ligatures that can look odd in body copy - set `font-feature-settings: "dlig" 0` (default off anyway).

**Runner-up: Figtree** (Erik Kennedy, OFL, variable 300-900, has italics). Widths match Sofia Pro to 1%, letter
shapes are the same model (double-storey `a`, single-storey `g`), it is friendlier/more humanist and better for
long body copy. Its x-height is 7% taller, so text looks a size larger; either accept it or drop body/nav sizes
by ~1px (16->15, 18->17). Jost is the honourable mention if a colder Futura-style look is wanted (single-storey `a`,
tall ascenders), but it is 9% narrower at 400 and its `a`/`y` differ visibly from Sofia Pro.

`size-adjust`: not needed for Outfit (deltas <= 3%). `next/font/google` does not expose `size-adjust` on the
Google font itself, only on the generated local fallback (`adjustFontFallback: true`, default). If Figtree is
chosen and we want Sofia-equivalent optical size, multiply font sizes by 0.94 (or add a self-hosted
`@font-face { size-adjust: 94% }` wrapper, which requires downloading the OFL file into `/public/fonts`).

## B. Header / nav spec

Structure: `header.main-header` (position: fixed, top 0, z-index 200, bg #090909, colour #fff, **not transparent
over the hero**; body gets `padding-top: 112px`) > `.header-content` (flex, space-between, padding 36px 0, no
max-width - full viewport minus side padding) > `.logo` + `.header-main` (flex, align center) > `.main-menu ul` +
`a.header-button` + `.header-icons`. The "scroll" class is added on scroll but only shrinks the header <= 961px.

| Measurement | 1440 | 1920 | 390 (mobile) |
|---|---|---|---|
| Header height | 112px | 112px | 70px (52px once scrolled: padding 6px) |
| Header side padding | 40px (30px <= 1247px) | 40px | 20px (<= 559px) |
| Header vertical padding | 36px | 36px | 15px |
| Content max-width | none (1360 wide) | none (1840 wide) | none (350 wide) |
| Logo (SVG) | 293 x 40 at x=40, y=36 | 293 x 40 at x=40 | 190 x 25.9 at x=20, y=22 |
| Nav items (text) | Get Keys, Locks v, Handles v, Accessories v, Talk to us | same | hidden; hamburger |
| Nav link font | 18px / 700 / normal tracking / lh 1.15 | 20px / 700 | menu: 32.4px / 500 / -0.97px |
| Nav link padding | 0 15px (box h 40px) | 0 20px | 12.15px 0 17px (row h 68px) |
| Nav `li` margin-right (box gap) | 10px | 10px | 1px divider rows |
| Text-to-text gap | 40px (15+10+15) | 50px (20+10+20) | - |
| Nav block | x 518-1134 (616.6 wide) | x 891-1598 (706.8 wide) | - |
| `.main-menu` margin-right | 20px | 20px | - |
| Dropdown caret | `::after` 11x9 SVG triangle #fecb3e, margin-left 5px, top -1px | same | 22px triangle, right-aligned |
| Hover | colour #fff -> #fecb3e, transition all .3s; no underline, no bg, no pseudo underline | same | - |
| CTA "Activate guarantee" | 177.5 x 36.7; 18px/600 -0.54px; padding 6px 13px 8px; 1px solid #f2712f; radius 4px; text #f2712f; bg transparent; hover bg #f2712f + #fff | 194 x 39; 20px/600 -0.6px | hidden (<= 559px); mobile menu shows full-width orange "Activate Guarantee" at the bottom |
| Gap CTA -> icons | 28px (`.header-icons` margin-left) | 28px | - |
| Icons | basket only (search/account hidden): 40x40 button, 36x36 bag SVG, stroke #f2712f, hover #fff; badge 18px white circle, 11px Arial 600 #f2712f | same, at x=1840 | basket 40x40 at x=280, hamburger 40x40 at x=330 (10px apart) |
| Icon column-gap | 34px (grid) | 34px | - |
| Mega menu panel | fixed, full-width, top 76px + 36px transparent pad (so panel starts at 112px); `.internal-container` bg #090909, border-top 1px #3c3c3c, padding 35px 30px | same | n/a (accordion in full-screen #090909 menu) |
| Mega menu cards | 3 cards 348 x 259 (calc(26.667% - 20px) of 1380), margin 0 10px, 1px #3c3c3c, radius 10px, image at 15% opacity + 30% grayscale, details padded 15px | 3 cards 476 x 354 | - |
| Card text | title 24px/500 -0.72px #fff; desc 16px/300 lh 24 #c1c1c1; buttons 16px/400 pad 5px 10px radius 4px ("Buy Online" solid #f2712f, "Explore" outline #f2712f); POPULAR pill 8px/500 +0.72px uppercase #f2712f radius 16px | same | - |
| "More Products" column | 256px wide, padding-top 40px, padding-left 77px; h3 24px/500 #fecb3e; links 17px/400 #fff underlined, 10px apart | 352px wide | - |
| Trustpilot strip under panel | bg #090909, border-top 1px #3c3c3c, padding 10px 40px, h 51px; logo max 100px, stars max 90px, "12500+ reviews" 16px/600 | same | - |
| Promo bar below header | 44px, bg #f2712f, 16px/600 -0.64px centred, link underlined | same | 44px |

Colours used in the header: bg `#090909`, white `#fff`, orange `#f2712f` (hover `#f37b3d`), yellow `#fecb3e`,
divider `#3c3c3c`, muted `#c1c1c1`. Site-wide extras: text `#504e4e`, hero section bg `#2a2a2a`, dark button
`#353535`, card bg `#f4f4f4`, footer bg `#000`.

Breakpoints that change the header: <= 1569px nav padding 0 15px; <= 1479px nav 18px + CTA 18px; <= 1299px nav
16px -0.48px + padding 0 10px; <= 1247px side padding 30px; <= 961px desktop menu hidden, hamburger shown,
header 70px; <= 559px side padding 20px, CTA hidden.

## C. How to apply in Tailwind v4

Font loading (replace Inter as the body face; keep the existing `--font-body` token so nothing else changes):

```ts
// src/app/layout.tsx
import { Outfit } from 'next/font/google';
const outfit = Outfit({ subsets: ['latin'], weight: 'variable', display: 'swap', variable: '--font-outfit' });
// <html className={outfit.variable}>
```
```css
/* globals.css */
@theme { --font-sans: var(--font-outfit), 'Outfit', system-ui, sans-serif; }
body { font-weight: 300; line-height: 1.15; color: #504e4e; font-synthesis: none; }
```

Header (desktop >= 1480 uses the 1920 numbers; 1280-1479 uses the 1440 numbers):

```html
<header class="fixed inset-x-0 top-0 z-[200] bg-[#090909] text-white px-5 min-[560px]:px-[30px] min-[1248px]:px-10">
  <div class="flex items-center justify-between py-[15px] min-[962px]:py-9">          <!-- 70px / 112px tall -->
    <a class="block h-[26px] w-[190px] min-[962px]:h-10 min-[962px]:w-[293px]">logo</a>
    <nav class="hidden min-[962px]:flex items-center">
      <ul class="mr-5 flex h-10 items-center">
        <li class="mr-2.5 last:mr-0">
          <a class="relative inline-flex h-10 items-center px-[15px] min-[1480px]:px-5 text-[18px] min-[1480px]:text-[20px] font-bold tracking-normal leading-[1.15] transition-colors duration-300 hover:text-[#fecb3e] after:ml-[5px] after:-translate-y-px">Locks</a>
        </li>
      </ul>
      <a class="hidden min-[560px]:inline-block rounded-[4px] border border-[#f2712f] px-[13px] pt-1.5 pb-2 text-[18px] min-[1480px]:text-[20px] font-semibold tracking-[-0.03em] text-[#f2712f] transition-all duration-300 hover:bg-[#f2712f] hover:text-white">Activate guarantee</a>
      <div class="ml-7 flex h-10 w-10 items-center justify-center text-[#f2712f] hover:text-white">basket svg 36x36</div>
    </nav>
  </div>
</header>
<main class="pt-[70px] min-[962px]:pt-[112px]">
```

Mega menu: `fixed inset-x-0 top-[76px] pt-9 invisible opacity-0 group-hover:visible group-hover:opacity-100`
wrapping `bg-[#090909] border-t border-[#3c3c3c] px-[30px] py-[35px]`; cards
`w-[calc(26.667%-20px)] mx-2.5 rounded-[10px] border border-[#3c3c3c] overflow-hidden`; title
`text-[24px] font-medium tracking-[-0.03em]`; description `text-[16px] font-light leading-6 text-[#c1c1c1]`;
buttons `rounded-[4px] border border-[#f2712f] px-2.5 py-[5px] text-[16px]` (+ `bg-[#f2712f] text-white` for primary).

Type scale utilities:

| Role | Tailwind |
|---|---|
| hero h1/h2 | `text-[40px] md:text-[100px] font-semibold leading-none tracking-[-0.04em]` |
| section h2 | `text-[37px] md:text-[100px] font-bold leading-[1.1] tracking-[-0.04em] text-[#090909]` |
| product h1 | `text-[38px] md:text-[60px] font-black leading-none tracking-[-0.04em] text-[#f2712f]` |
| eyebrow | `text-[26px] font-normal tracking-[-0.04em] text-[#f2712f]` |
| card h3 | `text-[24px] md:text-[30px] font-medium leading-[1.1] tracking-[-0.03em]` |
| body / card copy | `text-[16px] font-light leading-6 tracking-[-0.02em]` |
| price | `text-[20px] md:text-[24px] font-normal text-[#090909]` |
| primary button | `rounded-lg bg-[#f2712f] px-[30px] pt-3 pb-[15px] text-[22px] font-medium tracking-[-0.04em] text-white` (mobile: `w-full px-5 py-[15px] text-[16px]`) |
| outline button | same + `border border-white bg-transparent pt-[11px] pb-[13px]` |
| footer heading / link | `text-[32px] font-medium tracking-[-0.03em] text-[#fecb3e]` / `text-[18px] font-light leading-[1.6] tracking-[-0.03em]` |
| mobile menu item | `py-[12px] pb-[17px] text-[32px] font-medium tracking-[-0.03em] border-b border-[#3c3c3c]` |

## D. Screenshots (all in `/private/tmp/claude-501/-Users-pritam--claude-spares-spare-Z1Xpbz/30ed1f34-b404-4477-93b7-533c3f941c7c/scratchpad/ultion-measure/`)

- `home-1440-top.png`, `home-1920-top.png`, `home-390-top.png` - header + hero per viewport
- `home-1440-megamenu.png`, `home-1920-megamenu.png` - "Locks" mega menu open
- `home-1440-scrolled-header.png`, `home-1920-scrolled-header.png`, `home-390-scrolled-header.png` - header after 600px scroll (desktop unchanged, mobile 52px)
- `home-390-mobilemenu.png`, `product-390-mobilemenu.png` - full-screen mobile menu
- `home-1440-full.png`, `home-390-full.png` - full-page captures
- `product-1440-top.png`, `product-390-top.png`, `shop-1440-top.png` (+ `-megamenu`, `-scrolled-header`) - product/shop pages
- `specimen-sofia-nav-ultion.png`, `specimen-sofia-hero-ultion.png` - Sofia Pro reference crops from Ultion
- `specimen-google-candidates.png` - 12 Google Fonts candidates at nav/body/heading settings
- raw data: `data-*.json`, `hover-*.json`, `scrolled-*.json`, `mobilemenu-*.json`, `fontmetrics.json`, `typekit.css`, `theme.min.css`
