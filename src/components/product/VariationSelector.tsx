'use client';

import * as React from 'react';
import type { WooProduct } from '@/types';
import { Button } from '@/components/ui/Button';
import { QuantityControl } from '@/components/cart/QuantityControl';
import { DeliveryPromise } from '@/components/product/DeliveryPromise';
import { useCart } from '@/hooks/useCart';
import { getVariationModel, type VariationOption } from '@/lib/product-helpers';
import { formatPrice, decodeEntities } from '@/lib/wdlocks-api';
import { DEFAULT_VARIATION_ID, PRODUCT_IDS, WC_BASE } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { useSearchParams } from 'next/navigation';

interface Props {
  product: WooProduct;
  /** Called after a successful add (e.g. to close a modal). */
  onAdded?: () => void;
  /** Id of the heading element that labels this group. */
  headingId: string;
  className?: string;
  /** Show the keyed-alike / extra-keys upsells (product page). */
  showUpsells?: boolean;
}

const KEYED_ALIKE_PRICE_PENCE = 500;

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
        Composite doors are usually <strong className="text-near-black">35 / 35</strong>.
      </figcaption>
    </figure>
  );
}

export function VariationSelector({ product, onAdded, headingId, className, showUpsells = false }: Props) {
  const model = React.useMemo(() => getVariationModel(product), [product]);
  const { addToCart, isAdding } = useCart();
  const searchParams = useSearchParams();
  // Preselect: ?variation=<id> or ?size=35-35 (deep links), else the most common option so a shopper can buy with zero decisions.
  const [selected, setSelected] = React.useState<VariationOption | null>(() => {
    const byId = Number(searchParams.get('variation'));
    const bySize = searchParams.get('size')?.replace('-', '/');
    const fromQuery = model?.options.find((o) => o.available && (o.variationId === byId || o.short === bySize));
    if (fromQuery) return fromQuery;
    const def = DEFAULT_VARIATION_ID[product.id];
    return model?.options.find((o) => o.variationId === def && o.available) ?? null;
  });
  const [quantity, setQuantity] = React.useState(1);
  const [keyedAlike, setKeyedAlike] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const groupRef = React.useRef<HTMLDivElement>(null);

  if (!model) return null;
  const name = decodeEntities(product.name);
  const unitPence = Number.parseInt(product.prices.price, 10);
  const totalPence = unitPence * quantity + (keyedAlike ? KEYED_ALIKE_PRICE_PENCE : 0);
  const isLock = product.id === PRODUCT_IDS.CYLINDER_LOCK || product.id === PRODUCT_IDS.THUMB_TURN;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const radios = Array.from(groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])') ?? []);
    if (radios.length === 0) return;
    const idx = radios.findIndex((r) => r === document.activeElement);
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % radios.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + radios.length) % radios.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = radios.length - 1;
    e.preventDefault();
    radios[next].focus();
    radios[next].click();
  };

  const submit = async () => {
    setTouched(true);
    if (!selected) return;
    const ok = await addToCart({
      id: selected.variationId,
      quantity,
      variation: [{ attribute: selected.attribute, value: selected.termSlug }],
      name: `${name} (${selected.label})`,
      openDrawer: !keyedAlike,
    });
    if (ok && keyedAlike) {
      await addToCart({ id: PRODUCT_IDS.KEYED_ALIKE, quantity: 1, name: 'Keyed-alike service' });
    }
    if (ok) onAdded?.();
  };

  const showError = touched && !selected;

  return (
    <div className={cn('space-y-5', className)}>
      {model.kind === 'size' && <SizingDiagram insideLabel={model.insideLabel} />}

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p id={`${headingId}-label`} className="text-sm font-semibold text-near-black">{model.heading}</p>
          {selected ? (
            <p className="text-xs text-charcoal/75">
              Selected: <span className="font-medium text-near-black">{selected.label}</span>
            </p>
          ) : (
            <p className="text-xs text-charcoal/75">{model.kind === 'size' ? `${model.insideLabel} / Outside, mm` : 'Required'}</p>
          )}
        </div>
        <div
          ref={groupRef}
          role="radiogroup"
          aria-labelledby={`${headingId}-label`}
          aria-required="true"
          aria-invalid={showError || undefined}
          aria-describedby={showError ? `${headingId}-error` : undefined}
          onKeyDown={onKeyDown}
          className={cn('grid gap-2', model.kind === 'size' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2')}
        >
          {model.options.map((opt) => {
            const isSelected = selected?.variationId === opt.variationId;
            return (
              <button
                key={opt.variationId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${opt.label}${opt.available ? '' : ', unavailable'}`}
                tabIndex={isSelected || (!selected && opt === model.options.find((o) => o.available)) ? 0 : -1}
                disabled={!opt.available}
                onClick={() => { setSelected(opt); setTouched(false); }}
                className={cn(
                  'relative flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 text-sm transition-[border-color,background-color,color,transform,box-shadow] duration-150',
                  isSelected
                    ? 'border-red bg-red text-white shadow-[0_6px_14px_-8px_rgb(218_21_25/0.7)]'
                    : 'border-cream-dark bg-warm-white text-near-black hover:border-charcoal/50 hover:shadow-[0_0_0_3px_var(--cream-dark)]',
                  !opt.available && 'cursor-not-allowed opacity-40 line-through',
                )}
              >
                {opt.hex && (
                  <span aria-hidden="true" className="mb-1 h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: opt.hex }} />
                )}
                <span className="font-semibold tabular-nums">{opt.short}</span>
                {model.kind === 'size' && (
                  <span className={cn('text-[10px] leading-tight', isSelected ? 'text-white/90' : 'text-charcoal/75')}>
                    {opt.inside != null && opt.inside >= 30 ? 'in / out' : 'half'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {showError && (
          <p id={`${headingId}-error`} role="alert" className="mt-2 text-sm font-medium text-red">
            Please choose {model.kind === 'size' ? 'a size' : 'an option'} first.
          </p>
        )}
      </div>

      {showUpsells && isLock && (
        <div className="rounded-xl border border-cream-dark bg-cream p-4 text-sm">
          <p className="font-semibold text-near-black">Securing more than one door?</p>
          <p className="mt-0.5 text-xs text-charcoal/80">Set the quantity below and have every lock cut to the same key — one key for the whole house.</p>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={keyedAlike}
              onChange={(e) => setKeyedAlike(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red"
            />
            <span>
              <span className="font-medium text-near-black">Key my locks alike</span>{' '}
              <span className="text-charcoal/80">(+{formatPrice(KEYED_ALIKE_PRICE_PENCE)} service, adds the Keyed-alike item to your basket)</span>
            </span>
          </label>
          <p className="mt-3 text-xs text-charcoal/80">
            Need spares? <a href={`${WC_BASE}/product/watchdog-3-star-alps-extra-keys/`} rel="noopener" className="font-medium text-red underline-offset-2 hover:underline">Order extra keys cut to your key number ↗</a>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <QuantityControl value={quantity} onChange={setQuantity} itemName={name} min={1} max={product.sold_individually ? 1 : 99} disabled={isAdding} />
        <Button size="lg" className="flex-1" onClick={() => void submit()} loading={isAdding} disabled={!product.is_in_stock}>
          {product.is_in_stock ? (
            <>
              Add to basket <span aria-hidden="true" className="opacity-70">·</span> {formatPrice(totalPence)}
            </>
          ) : (
            'Out of stock'
          )}
        </Button>
      </div>
      <p className="text-xs text-charcoal/75">Includes 3 keys. Prices include VAT. Delivery chosen at checkout.</p>
      <DeliveryPromise />
    </div>
  );
}
