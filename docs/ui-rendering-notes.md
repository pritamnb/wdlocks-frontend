# UI rendering notes: product-card alignment (`/#products`) vs Ultion

Date: 2026-11-11. Measured with Playwright 1.65 (Chromium) against https://wdlocks-frontend.vercel.app/ and
https://www.ultion-lock.co.uk/ at 1440x900, 1024x768, 768x1024, 390x844. Raw numbers and screenshots:
`/private/tmp/claude-501/-Users-pritam--claude-spares-spare-Z1Xpbz/30ed1f34-b404-4477-93b7-533c3f941c7c/scratchpad/ui-cards/`
(`ours-<w>.png`, `ultion-<w>.png`, `ours-measurements.json`, `ultion-measurements.json`). No `src/` files were changed.

## 1. Why our cards do not line up

Source: `src/components/product/ProductCard.tsx` (card) and `src/components/product/ProductGrid.tsx` (grid:
`ul.grid gap-5 grid-cols-1 sm:2 lg:3 xl:4`, each `li` wraps one `article.flex.flex-col`).

Measured at 1440 (4 columns, card width 289, image box 289x289, gap 20). Heights in px; "lines" = rendered line count.

| Card | card h | h3 h (lines) | blurb h (lines) | price top | CTA top | CTA |
|---|---|---|---|---|---|---|
| 3 Star Cylinder Lock | 519 | 33 (1) | 49 (2) | 398 | 442 | button 220x48, 14px |
| 3 Star Thumb Turn | 519 | 33 (1) | 49 (2) | 398 | 442 | button |
| Rim Cylinder | 519 | 33 (1) | 49 (2) | 398 | 442 | button |
| Half Cylinder 10/35 | 519 | 33 (1) | 49 (2) | 398 | 442 | button |
| 3 Star Extra Keys | 519 | 33 (1) | 49 (2) | 399 | 443 | **link** 220x48, 16px/600, label wraps to 2 lines |
| 1 Star Extra Keys | **494** | 33 (1) | **24 (1)** | **375** | **419** | button |
| Keyed-Alike Service | **494** | 33 (1) | **24 (1)** | **375** | **419** | button |
| Lock Lubricant | 519 | 33 (1) | 49 (2) | 399 | 443 | button |
| Bruno Teddy Signal Blocker | **552** | **66 (2)** | 49 (2) | **432** | **476** | button |

Same pattern at every width (1024: 536/512/545; 768: 580/555/588; 390: 496/471). Computed type: h3 24px/33px
(22px/30.25px below 640) weight 500; blurb 15px/24.375px; price 16px/24px 600 `tabular-nums`; Button CTA 14px/20px 500;
Link CTA 16px/24px 600. Card: `rounded-[10px]`, `bg #f0f0f0`, body `px-6 pb-7 pt-2`, image `p-8`.

Causes, in order of impact:

1. **Nothing reserves a height for the title or blurb.** The body is `flex flex-col` with `mt-auto` on the CTA, which only
   pins the button to the bottom of *its own* card. Blurbs that fit on one line at 289px ("Spare keys for 1 Star cylinders.",
   "One key for every lock you order.") make those cards 25px shorter; "Bruno Teddy Signal Blocker" wraps the h3 to two lines
   and makes that card 33px taller. Price and CTA therefore sit at three different y positions within one row.
2. **The `li` stretches but the `article` does not.** CSS grid gives every `li` in a row the same height (align-items stretch),
   but `article` has no `h-full`, so the grey card itself ends early and the bottom edges are ragged (519 vs 494 in row 2).
3. **Two different CTA elements.** Simple/variable products render `<Button size="md" className="text-base">`, which still
   computes to 14px because `text-sm` from `size="md"` wins (`cn` does not merge Tailwind conflicts). External-only products
   render a `<Link>` at 16px/600 with no `whitespace-nowrap`, so "Order with key number" wraps to two lines inside the 48px box.
4. **Image padding and photo backgrounds.** `p-8` leaves a 225px photo in a 289px box; Rim Cylinder, keys, Keyed-Alike and
   the teddy are JPEGs with white backgrounds, so they render as white rectangles on the grey card (Ultion's are cut-out PNGs).
5. **Orphan ninth card.** The homepage passes no `limit`, so 9 products render: a lone card on row 3 at xl, row 4 at lg.
6. "From" prefix: not a cause today. The Store API returns no `price_range` for these variable products, so `From` never
   rendered at any width; but if it ever does, it is a 12px inline span inside the 24px price line, so it cannot change height.

## 2. Ultion benchmark (homepage "Our Products" grid; Ultion has no shop grid, locks/keys go to configurators)

Markup: `.products-wrapper` is `display:flex; flex-wrap; gap:20px` (20px 15px on mobile), 8 cards, 4/3/2/1 per row at
1440/1024/768/390, exactly our column counts. Content wrapper is 1360px wide (40px gutters) vs our 1216px container.

| Property | Ultion (1440) | Ours (1440) |
|---|---|---|
| Card | 325x542 (row 1) / 325x518 (row 2), `bg #f4f4f4`, `radius 20px`, no border, no shadow | 289x494-552, `#f0f0f0`, 10px |
| Image zone | `padding 20px 20px 0`, img 285x285 square, cut-out PNG, `object-fit: fill` | `p-8` (32px), 225px photo |
| Content zone | `padding 30px 20px 20px`, flex column, text centred | `px-6 pb-7 pt-2` |
| Title | sofia-pro 30px/33px, weight 500, letter-spacing -0.9px (-0.03em), always 1 line | Inter 24px/33px 500 |
| Blurb | 16px/24px weight 300, 2-3 lines, no clamp | 15px/24.4px, 1-2 lines |
| Price | **none on cards** | 16px/600 |
| Button | `a.btn` 200x52, `bg #f2712f`, `radius 8px`, 22px/500, `padding 12px 30px 15px`, inline-block centred; 200x48 and 16px on mobile | 220x48, 14px or 16px |
| Button top | identical within a row (470 / 446) because the button row is pushed to the bottom and rows stretch | 419-476 |
| Hover | card: nothing (no lift, no shadow, no image zoom); button: bg to `#f37b3d`, `transition .3s ease-in-out` | lift 2px + shadow + image scale 1.04 |
| Mobile (390) | 1 column, card 350x553, image 330px, title 24px, button 200x48 | 1 column, card 358x471-496 |

Note Ultion also is not perfectly equal across *rows* (542 vs 518: their row-1 blurbs run to 3 lines) but is perfectly
equal within a row, which is what the eye reads. Screenshots: `ultion-1440.png`, `ultion-390.png`.

## 3. Research: what current guidance says

- **Subgrid for cross-card alignment.** `grid-template-rows: subgrid` lets each card adopt the parent's row tracks, so the
  title/blurb/price/button rows line up across the whole row, not just inside each card; parent `gap` is inherited and can be
  overridden on the subgrid. Baseline "Widely available" since Sept 2023 (Chrome 117, Firefox 71, Safari 16)
  ([MDN Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid),
  [WebKit: subgrid, how to line up elements](https://webkit.org/blog/17339/subgrid-how-to-line-up-elements-to-your-hearts-content/),
  [DEV: aligning product cards with subgrid](https://dev.to/giulianovarriale/aligning-product-cards-with-subgrid-3o06)).
  Tailwind v4 ships `grid-rows-subgrid` and `row-span-N` ([Tailwind grid-template-rows](https://tailwindcss.com/docs/grid-template-rows)).
  Verified by compiling against the installed tailwindcss 4.3.3: `grid-rows-subgrid`, `row-span-5`, `min-h-[2lh]`,
  `line-clamp-2`, `text-balance`, `text-pretty`, `tabular-nums`, `motion-reduce:transition-none`,
  `motion-reduce:hover:translate-y-0`, `[content-visibility:auto]`, `[contain-intrinsic-size:auto_600px]` all emit CSS.
- **Flex `mt-auto` only aligns within a card**; equal heights come from the row (grid/flex stretch), so you still need `h-full`
  on the card and fixed zones or subgrid for the inner rows
  ([cruip: stick elements at the bottom of equal-height cards](https://cruip.com/?p=173163),
  [DEV: equal-height cards with flexbox](https://dev.to/jennavisions/building-responsive-equal-height-cards-with-modern-css-magic-of-flexbox-no-media-queries-2h0b)).
- **Reserve lines with `lh` + clamp.** `line-clamp` is only a maximum; pair it with `min-height: 2lh` and an explicit
  line-height so short titles keep the same height as long ones. `lh` = computed line-height
  ([MDN length](https://developer.mozilla.org/en-US/docs/Web/CSS/length)); support Chrome 109, Safari 16.4, Firefox 120,
  about 95.6% global ([caniuse](https://caniuse.com/mdn-css_types_length_lh)). Tailwind's `line-clamp-2` is the
  `-webkit-box` recipe ([CSS-Tricks line-clampin'](https://css-tricks.com/line-clampin/)).
- **`text-wrap: balance`** evens line lengths on short headings (<=6 lines in Chromium) at negligible cost; **`pretty`** avoids
  orphans in body copy. Baseline since March 2024 ([MDN text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap)).
- **CLS:** reserve media space with `width`/`height` attributes or `aspect-ratio`; never animate layout properties
  ([web.dev optimize CLS](https://web.dev/articles/optimize-cls)). Our image box (`aspect-square` + `fill`) already does this.
- **Animate only `transform` and `opacity`** (compositor-only; a `top/left` demo dropped 50% of frames vs about 1% for
  transform) ([web.dev animations guide](https://web.dev/articles/animations-guide)). `box-shadow` transitions repaint every
  frame: fade a pre-rendered shadow on a pseudo-element with `opacity` instead. Avoid the "doom flicker" of an element moving
  out from under the cursor and honour `prefers-reduced-motion: reduce` with `transition: none`
  ([Josh Comeau, CSS transitions](https://www.joshwcomeau.com/animation/css-transitions/)).
- **`will-change` is a last resort**: it costs GPU memory, should not live permanently in stylesheets, and should be set
  shortly before and removed after a change ([MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)).
- **Fonts:** `font-display: optional` for body text if CLS matters, `swap` for brand faces delivered early; match fallback
  metrics with `size-adjust`; subset ([web.dev font best practices](https://web.dev/articles/font-best-practices)).
  `next/font` already defaults to `display: swap` with automatic fallback metrics (`adjustFontFallback`), and `globals.css`
  sets `-webkit-font-smoothing: antialiased` (macOS only; pair with `-moz-osx-font-smoothing: grayscale`).
  `text-rendering: optimizeLegibility` is a stylistic choice, not a performance fix; Chromium already enables kerning/ligatures.
- **`content-visibility: auto`** skips layout/paint for off-screen sections (7x faster initial render in Google's demo); pair
  with `contain-intrinsic-size` to avoid scrollbar jumps ([web.dev content-visibility](https://web.dev/articles/content-visibility)).

## 4. Recommendation (copy-paste)

Approach: parent grid keeps auto rows; each card spans **5 rows** (image, title, blurb, price, CTA) and adopts them with
`grid-rows-subgrid`; every zone also gets a reserved height (`min-h-[2lh]`, fixed `h-*`) so the layout is identical in
browsers without subgrid (the invalid `subgrid` value is simply dropped and the fixed zones still align). Both `li` and
`article` must be subgrids because the `li` is the real grid item (nested subgrid is allowed). `gap-y-0` on the subgrid
overrides the inherited 20px between the five internal rows; the 20px between card rows and columns stays.

`ProductGrid.tsx`:

```tsx
<ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy={loading}>
  {visible.map((p, i) => (
    <li key={p.id} className="grid grid-rows-subgrid row-span-5 gap-y-0">
      <ProductCard … />
    </li>
  ))}
</ul>
```
On the homepage pass `limit={8}` (`src/app/page.tsx`) so the grid is 2x4 like Ultion and the ninth card does not orphan.

`ProductCard.tsx` (drop the inner `div.flex.flex-1…` wrapper; the five zones become direct children of `article`):

```tsx
<article className="group relative grid grid-rows-subgrid row-span-5 gap-y-0 h-full overflow-hidden rounded-[20px] bg-[#f4f4f4]
  transition-transform duration-300 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
  {/* 1 image: fixed square, 20px inset like Ultion */}
  <Link href={href} className="relative block aspect-square overflow-hidden" aria-label={name} tabIndex={-1}>
    <Image … className="object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none" />
  </Link>
  {/* 2 title: always exactly 2 lines tall, clamped, balanced */}
  <h3 className="px-5 pt-6 text-center text-[26px] font-medium leading-[1.15] tracking-[-0.02em] text-near-black
    min-h-[calc(2lh+1.5rem)] line-clamp-2 text-balance sm:text-[28px]">
    <Link href={href} className="transition-colors duration-150 hover:text-red focus-visible:text-red">{entry?.shortName ?? name}</Link>
  </h3>
  {/* 3 blurb: reserved 2 lines even when empty or one line */}
  <p className="mx-auto max-w-[28ch] px-5 pt-2 text-center text-[15px] leading-6 text-[#353535]/80 min-h-[calc(2lh+0.5rem)] line-clamp-2 text-pretty">
    {entry?.blurb}
  </p>
  {/* 4 price: one fixed 24px line; "From" lives inside the same line box */}
  <p className="px-5 pt-3 text-center text-base font-semibold leading-6 tabular-nums text-near-black h-[calc(1.5rem+0.75rem)]">
    {isVariable && product.prices.price_range && <span className="mr-1 text-xs font-normal text-charcoal/75">From</span>}
    {productPriceLabel(product)}
  </p>
  {/* 5 CTA: identical box for Button and Link */}
  <div className="px-5 pb-6 pt-5">
    <CtaElement className="mx-auto flex h-12 w-full max-w-[220px] items-center justify-center whitespace-nowrap rounded-lg bg-red px-6 text-base font-semibold text-white transition-colors duration-300 hover:bg-red-deep" />
  </div>
</article>
```
Notes: `min-h-[calc(2lh+1.5rem)]` = two lines plus the zone's own top padding (`lh` is resolved against the element's own
line-height, so keep the explicit `leading-*` on the same element). For the CTA, give `Button` a `size` that does not set
`text-sm` (or add `text-base` via tailwind-merge) so Button and Link both render 16px/600, and shorten `ctaLabel` for extra
keys to "Order keys" so it never wraps at 220px. If the design prefers the old-site grey, keep `bg-[#f0f0f0]`; the Ultion
values are `#f4f4f4`, radius 20, image inset 20, content `30/20/20`, title 30px/1.1/-0.03em, button 200x52 radius 8, 22px.
If the lift/shadow hover is kept, render the shadow on `::after` and transition its `opacity`, not `box-shadow`.
Verify in Chrome DevTools: the grid badge on `ul` draws the five shared row lines through every card in a row.

## 5. Five quick polish wins (from the side-by-side screenshots)

1. **Cut-out product photos.** Rim Cylinder, both key images, Keyed-Alike and Bruno show white JPEG rectangles on the grey
   card; Ultion's PNGs float on the tile. Export transparent PNG/WebP (or set the card to pure white) for the biggest visual gain.
2. **Larger, tighter titles and bigger CTA type.** Ultion: 30px title at -0.03em and a 22px "Buy Now"; ours 24px and 14px.
   Moving to 26-28px titles and a 16-18px semibold CTA closes most of the "premium" gap without new assets.
3. **Widen the products container** from 1216 to about 1360px at xl (Ultion's cards are 325 vs our 289), or keep 1216 and
   use 3 columns at xl so the cards breathe; either way keep `limit={8}`.
4. **Quieter hover.** Ultion moves nothing on hover; our lift + animated `box-shadow` + 1.04 image zoom reads busy and repaints.
   Keep at most the 2px lift (transform) and a button colour change, and add `motion-reduce:` variants (currently 0 uses in `src/`).
5. **Below-the-fold rendering.** Add `[content-visibility:auto] [contain-intrinsic-size:auto_600px]` to the homepage sections
   after `#products` (Protection, WhyWatchdog, video bars, reviews), keep `priority` only on the first row of images, and add
   `-moz-osx-font-smoothing: grayscale` beside the existing `-webkit-font-smoothing` in `globals.css`.
