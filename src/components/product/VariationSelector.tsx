'use client';

import * as React from 'react';
import Link from 'next/link';
import type { WooProduct } from '@/types';
import { Button } from '@/components/ui/Button';
import { QuantityControl } from '@/components/cart/QuantityControl';
import { DeliveryPromise } from '@/components/product/DeliveryPromise';
import { useCart } from '@/hooks/useCart';
import { getVariationModel, type VariationOption } from '@/lib/product-helpers';
import { formatPrice, decodeEntities } from '@/lib/wdlocks-api';
import { CHECKOUT_MODE, CHECKOUT_URL, DEFAULT_VARIATION_TERM, PRODUCT_IDS } from '@/lib/constants';
import { catalogueEntry } from '@/lib/catalogue';
import { cn } from '@/lib/cn';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  product: WooProduct;
  /** Called after a successful add (e.g. to close a modal). */
  onAdded?: () => void;
  /** Id of the heading element that labels this group. */
  headingId: string;
  className?: string;
  /** Full configurator (product page): control switch, keyed-alike, checkout now, sticky total bar. */
  showUpsells?: boolean;
  /** Inc-VAT pence per variation id, from WooCommerce; missing ids use the product's own price. */
  variationPrices?: Record<number, number>;
}

function SizingDiagram({ insideLabel }: { insideLabel: string }) {
  return (
    <figure className="rounded-xl border border-cream-dark bg-cream p-3">
      <svg viewBox="0 0 320 110" className="h-auto w-full" role="img" aria-labelledby="sizing-diagram-title">
        <title id="sizing-diagram-title">How to measure: from the centre screw hole to each end of the cylinder</title>
        <rect x="30" y="38" width="260" height="24" rx="6" fill="#B9BCC0" stroke="#292734" strokeWidth="1.5" />
        <rect x="150" y="30" width="20" height="40" rx="3" fill="#292734" />
        <circle cx="160" cy="50" r="3.5" fill="#F8F3EC" />
        <text x="160" y="24" textAnchor="middle" fontSize="10" fill="#292734" fontFamily="Inter, sans-serif">centre screw</text>
        <line x1="32" y1="84" x2="158" y2="84" stroke="#DA1519" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrowRev)" />
        <text x="95" y="100" textAnchor="middle" fontSize="11" fontWeight="600" fill="#DA1519" fontFamily="Inter, sans-serif">{insideLabel} (A)</text>
        <line x1="162" y1="84" x2="288" y2="84" stroke="#DA1519" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrowRev)" />
        <text x="225" y="100" textAnchor="middle" fontSize="11" fontWeight="600" fill="#DA1519" fontFamily="Inter, sans-serif">Outside (B)</text>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#DA1519" /></marker>
          <marker id="arrowRev" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6 z" fill="#DA1519" /></marker>
        </defs>
      </svg>
      <figcaption className="mt-2 text-xs leading-relaxed text-charcoal/80">
        Measure in millimetres from the centre of the fixing screw to each end. <strong className="text-near-black">A</strong> is the
        {' '}{insideLabel.toLowerCase()} measurement, <strong className="text-near-black">B</strong> is the outside. Round up to the nearest size.
      </figcaption>
    </figure>
  );
}

const selectCls =
  'h-12 w-full appearance-none rounded-xl border border-cream-dark bg-warm-white px-4 pr-10 text-sm font-semibold text-near-black transition-[border-color,box-shadow] duration-150 focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30';

function Chevron() {
  return (
    <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
  );
}

export function VariationSelector({ product, onAdded, headingId, className, showUpsells = false, variationPrices }: Props) {
  const model = React.useMemo(() => getVariationModel(product), [product]);
  const { addToCart, isAdding, products } = useCart();
  // The keyed-alike add-on is a WooCommerce product: its name and price come from the store.
  const keyedAlikeProduct = products.find((p) => p.id === PRODUCT_IDS.KEYED_ALIKE) ?? null;
  const keyedAlikePence = keyedAlikeProduct ? Number.parseInt(keyedAlikeProduct.prices.price, 10) || 0 : 0;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = React.useState<VariationOption | null>(() => {
    const byId = Number(searchParams.get('variation'));
    const bySize = searchParams.get('size')?.replace('-', '/');
    const fromQuery = model?.options.find((o) => o.available && (o.variationId === byId || o.short === bySize));
    if (fromQuery) return fromQuery;
    const def = DEFAULT_VARIATION_TERM[product.id];
    return model?.options.find((o) => o.termSlug === def && o.available) ?? null;
  });
  const [quantity, setQuantity] = React.useState(1);
  const [keyedAlike, setKeyedAlike] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [barVisible, setBarVisible] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const switchRef = React.useRef<HTMLFieldSetElement>(null);

  // After a Key operated ↔ Thumb turn switch the other product renders with different heights above the configurator;
  // restore the switch to the exact screen position it had before the click so it stays under the cursor.
  React.useLayoutEffect(() => {
    try {
      const raw = sessionStorage.getItem('wd:switch-anchor');
      if (!raw) return;
      sessionStorage.removeItem('wd:switch-anchor');
      const { top, at } = JSON.parse(raw) as { top: number; at: number };
      if (Date.now() - at > 5000 || !switchRef.current) return;
      const settle = () => {
        const el = switchRef.current;
        if (!el) return;
        const now = el.getBoundingClientRect().top;
        if (Math.abs(now - top) > 2) window.scrollBy({ top: now - top, behavior: 'instant' as ScrollBehavior });
      };
      settle();
      // Images and fonts above the configurator can still change height for a moment after the route change, so
      // correct a few more times — but only until the shopper scrolls: Pritam, 12 Nov, "scrolled (up or below)
      // window resets" was this loop (it used to run for 3.2 s) undoing a scroll made after the switch.
      const timers = [60, 200, 500].map((ms) => setTimeout(settle, ms));
      const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
      const stop = () => {
        timers.forEach(clearTimeout);
        events.forEach((ev) => window.removeEventListener(ev, stop));
      };
      events.forEach((ev) => window.addEventListener(ev, stop, { passive: true }));
      return stop;
    } catch {
      /* ignore */
    }
  }, [product.id]);

  // The Key operated ↔ Thumb turn switch is a route change to the sibling product. Prefetch that page (with the size
  // the shopper has picked, so the href matches) so the switch renders at once instead of flashing the route's loading
  // skeleton and letting the page shrink to it (Pritam, 12 Nov: "screen flickers").
  const siblingId = product.id === PRODUCT_IDS.CYLINDER_LOCK ? PRODUCT_IDS.THUMB_TURN : product.id === PRODUCT_IDS.THUMB_TURN ? PRODUCT_IDS.CYLINDER_LOCK : null;
  const siblingSlug = siblingId ? products.find((p) => p.id === siblingId)?.slug : undefined;
  const sizeQuery = selected?.short ? `?size=${selected.short.replace('/', '-')}` : '';
  React.useEffect(() => {
    if (siblingSlug) router.prefetch(`/products/${siblingSlug}${sizeQuery}`);
  }, [router, siblingSlug, sizeQuery]);

  // Sticky total bar appears once the configurator has scrolled out of view (Ultion pattern).
  React.useEffect(() => {
    if (!showUpsells) return;
    const el = panelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBarVisible(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [showUpsells]);

  if (!model) return null;
  const name = decodeEntities(product.name);
  const unitPence = (selected && variationPrices?.[selected.variationId]) || Number.parseInt(product.prices.price, 10);
  const totalPence = unitPence * quantity + (keyedAlike ? keyedAlikePence : 0);
  const isLock = product.id === PRODUCT_IDS.CYLINDER_LOCK || product.id === PRODUCT_IDS.THUMB_TURN;
  const isSize = model.kind === 'size';

  // Size selects: inside list from the real variations; outside list filtered by the chosen inside.
  const insides = Array.from(new Set(model.options.filter((o) => o.available).map((o) => o.inside ?? 0))).sort((a, b) => a - b);
  const currentInside = selected?.inside ?? null;
  const outsides = model.options.filter((o) => o.available && (o.inside ?? 0) === (currentInside ?? insides[0] ?? 0));
  const pickInside = (v: number) => {
    const sameOutside = model.options.find((o) => o.available && (o.inside ?? 0) === v && o.outside === selected?.outside);
    setSelected(sameOutside ?? model.options.find((o) => o.available && (o.inside ?? 0) === v) ?? null);
    setTouched(false);
  };
  const pickOutside = (variationId: number) => {
    setSelected(model.options.find((o) => o.variationId === variationId) ?? null);
    setTouched(false);
  };

  const otherLockId = product.id === PRODUCT_IDS.CYLINDER_LOCK ? PRODUCT_IDS.THUMB_TURN : PRODUCT_IDS.CYLINDER_LOCK;
  const otherLockProduct = products.find((p) => p.id === otherLockId);
  const otherLock = otherLockProduct ? catalogueEntry(otherLockProduct) : undefined;

  const add = async (openDrawer: boolean) => {
    setTouched(true);
    if (!selected) return false;
    const image = product.images[0];
    const ok = await addToCart({
      id: selected.variationId,
      quantity,
      variation: [{ attribute: selected.attribute, value: selected.termSlug }],
      name: `${name} (${selected.label})`,
      openDrawer: openDrawer && !keyedAlike,
      preview: {
        name,
        pricePence: unitPence,
        image: image ? { src: image.src, thumbnail: image.thumbnail, alt: image.alt } : null,
        variation: [{ attribute: model.kind === 'size' ? 'Size' : model.kind === 'colour' ? 'Finish' : 'Option', value: selected.label }],
      },
    });
    if (ok && keyedAlike) {
      await addToCart({ id: PRODUCT_IDS.KEYED_ALIKE, quantity: 1, name: 'Keyed-alike service', openDrawer });
    }
    if (ok) onAdded?.();
    return ok;
  };

  /**
   * Buy now: straight to secure payment on wdlocks.co.uk with this one line (WooCommerce adds it natively).
   * With the keyed-alike add-on there are two lines, which native handoff cannot carry, so that path goes
   * through the basket review page instead.
   */
  const buyNow = async () => {
    setTouched(true);
    if (!selected) return;
    setCheckingOut(true);
    try {
      if (keyedAlike || CHECKOUT_MODE !== 'handoff') {
        const ok = await add(false);
        if (!ok) return;
        router.push('/checkout');
        return;
      }
      const url = new URL(CHECKOUT_URL);
      url.searchParams.set('add-to-cart', String(selected.variationId));
      url.searchParams.set('quantity', String(quantity));
      url.searchParams.set('utm_source', 'headless');
      window.location.assign(url.toString());
    } finally {
      setCheckingOut(false);
    }
  };

  const showError = touched && !selected;

  return (
    <div className={cn('space-y-5', className)} ref={panelRef}>
      {showUpsells && isLock && (
        <div className="rounded-xl border border-cream-dark bg-cream p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red/10 text-red" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4" /><path d="M10.85 12.15 19 4l2 2-2 2-2-2-2 2 2 2" /></svg>
            </span>
            <p className="text-sm font-semibold text-near-black">This lock includes 3 Watchdog keys as standard</p>
          </div>
          <p className="mt-2 text-xs text-charcoal/80">
            Need spares later? Extra keys are cut to the key number on your key.{' '}
            <Link href="/products/watchdog-3-star-alps-extra-keys" className="font-medium text-red underline-offset-2 hover:underline">Order extra keys</Link>
          </p>
        </div>
      )}

      {showUpsells && isLock && otherLock && (
        <fieldset ref={switchRef}>
          <legend className="mb-2 text-sm font-semibold text-near-black">Internal control</legend>
          {/* Fixed positions: Key operated always left, Thumb turn always right; only the radio state changes. */}
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Internal control">
            {([
              { id: PRODUCT_IDS.CYLINDER_LOCK, label: 'Key operated' },
              { id: PRODUCT_IDS.THUMB_TURN, label: 'Thumb turn' },
            ] as const).map((opt) => {
              const isCurrent = opt.id === product.id;
              const target = products.find((p) => p.id === opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isCurrent}
                  aria-current={isCurrent ? 'true' : undefined}
                  disabled={isCurrent}
                  onClick={() => {
                    if (isCurrent || !target) return;
                    try {
                      sessionStorage.setItem('wd:switch-anchor', JSON.stringify({ top: switchRef.current?.getBoundingClientRect().top ?? 0, at: Date.now() }));
                    } catch {
                      /* ignore */
                    }
                    router.push(`/products/${target.slug}${sizeQuery}`, { scroll: false });
                  }}
                  className={cn(
                    'flex h-12 items-center gap-3 rounded-xl border bg-warm-white px-4 text-left text-sm font-semibold text-near-black transition-colors duration-300',
                    isCurrent ? 'cursor-default border-red' : 'border-cream-dark hover:border-charcoal/50',
                  )}
                >
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', isCurrent ? 'border-red' : 'border-cream-dark')} aria-hidden="true">
                    {isCurrent && <span className="h-2.5 w-2.5 rounded-full bg-red" />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {showUpsells && isLock && (
        <div>
          <p className="mb-2 text-sm font-semibold text-near-black">Finish</p>
          <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-red bg-warm-white px-4 text-sm font-medium text-near-black">
            <span className="h-4 w-4 rounded-full bg-[linear-gradient(135deg,#d9d9d9,#8f9397)] ring-1 ring-black/10" aria-hidden="true" />
            Satin nickel
          </span>
        </div>
      )}

      {isSize ? (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-near-black">{model.insideLabel} size</span>
              <span className="relative block">
                <select className={selectCls} value={currentInside ?? ''} onChange={(e) => pickInside(Number(e.target.value))} aria-describedby={showError ? `${headingId}-error` : undefined}>
                  {currentInside == null && <option value="">Choose</option>}
                  {insides.map((v) => (
                    <option key={v} value={v}>{v === 0 ? 'Half (10mm)' : `${v}mm`}</option>
                  ))}
                </select>
                <Chevron />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-near-black">Outside size</span>
              <span className="relative block">
                <select className={selectCls} value={selected?.variationId ?? ''} onChange={(e) => pickOutside(Number(e.target.value))} disabled={currentInside == null}>
                  {!selected && <option value="">Choose</option>}
                  {outsides.map((o) => (
                    <option key={o.variationId} value={o.variationId}>{o.outside}mm</option>
                  ))}
                </select>
                <Chevron />
              </span>
            </label>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-charcoal/80">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-charcoal/40 text-[10px] font-bold" aria-hidden="true">i</span>
            <span>Composite doors are usually <strong className="text-near-black">35mm and 35mm</strong>. <a href="#measuring" className="font-medium text-red underline-offset-2 hover:underline">View lock measuring guide.</a></span>
          </p>
          {showError && (
            <p id={`${headingId}-error`} role="alert" className="mt-2 text-sm font-medium text-red">Please choose both sizes first.</p>
          )}
        </div>
      ) : (
        <div>
          <p id={`${headingId}-label`} className="mb-2 text-sm font-semibold text-near-black">{model.heading}</p>
          <div role="radiogroup" aria-labelledby={`${headingId}-label`} className="grid grid-cols-2 gap-2">
            {model.options.map((opt) => {
              const isSelected = selected?.variationId === opt.variationId;
              return (
                <button key={opt.variationId} type="button" role="radio" aria-checked={isSelected} disabled={!opt.available} onClick={() => { setSelected(opt); setTouched(false); }}
                  className={cn('flex h-12 items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition-colors duration-150', isSelected ? 'border-red bg-warm-white text-near-black' : 'border-cream-dark bg-warm-white text-near-black hover:border-charcoal/50', !opt.available && 'cursor-not-allowed opacity-40 line-through')}>
                  {opt.hex && <span aria-hidden="true" className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: opt.hex }} />}
                  {opt.label}
                </button>
              );
            })}
          </div>
          {showError && <p id={`${headingId}-error`} role="alert" className="mt-2 text-sm font-medium text-red">Please choose an option first.</p>}
        </div>
      )}

      {/* Shown only while WooCommerce sells the keyed-alike service (its price is the store's). */}
      {showUpsells && isLock && keyedAlikeProduct && keyedAlikeProduct.is_in_stock && keyedAlikePence > 0 && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-dark bg-cream p-4 text-sm">
          <input type="checkbox" checked={keyedAlike} onChange={(e) => setKeyedAlike(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red" />
          <span>
            <span className="font-semibold text-near-black">Key my locks alike</span>{' '}
            <span className="text-charcoal/80">(+{formatPrice(keyedAlikePence)}) — set the quantity below and every lock is cut to one key.</span>
          </span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <QuantityControl value={quantity} onChange={setQuantity} itemName={name} min={1} max={product.sold_individually ? 1 : 99} disabled={isAdding || checkingOut} />
        <p className="text-sm text-charcoal/75">{quantity === 1 ? '1 lock' : `${quantity} locks`}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" variant="secondary" onClick={() => void add(true)} loading={isAdding && !checkingOut} disabled={!product.is_in_stock}>
          Add to basket
        </Button>
        <Button size="lg" onClick={() => void buyNow()} loading={checkingOut} disabled={!product.is_in_stock}>
          {product.is_in_stock ? <>Buy now <span aria-hidden="true" className="opacity-70">·</span> {formatPrice(totalPence)}</> : 'Out of stock'}
        </Button>
      </div>
      <p className="text-xs text-charcoal/75">Buy now goes straight to secure payment on wdlocks.co.uk. Prices include VAT; delivery is chosen at checkout.</p>
      <DeliveryPromise />

      <div id="measuring" className="scroll-mt-32">{isSize && <SizingDiagram insideLabel={model.insideLabel} />}</div>

      {showUpsells && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 border-t border-cream-dark bg-warm-white/95 backdrop-blur transition-transform duration-200',
            barVisible ? 'translate-y-0' : 'translate-y-full',
          )}
          aria-hidden={!barVisible}
        >
          <div className="container-wd flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-charcoal/80">
              <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">Total</span>{' '}
              <span className="font-playfair text-xl font-semibold text-near-black">{formatPrice(totalPence)}</span>
              <span className="mx-2 text-charcoal/40">|</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">Qty</span> {quantity} {quantity === 1 ? 'lock' : 'locks'}
              {selected && <span className="ml-2 hidden text-charcoal/60 sm:inline">· {selected.short}</span>}
            </p>
            <Button size="md" onClick={() => void buyNow()} loading={checkingOut} disabled={!product.is_in_stock} tabIndex={barVisible ? 0 : -1}>
              Buy now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
