'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CATALOGUE, type ProductKey } from '@/lib/constants';

export const MENU_GROUPS: ReadonlyArray<{ title: string; keys: ProductKey[] }> = [
  { title: 'Euro Cylinders', keys: ['CYLINDER_LOCK', 'THUMB_TURN', 'HALF_CYLINDER'] },
  { title: 'Rim & Specialist', keys: ['RIM_CYLINDER', 'BRUNO_TEDDY'] },
  { title: 'Keys & Aftercare', keys: ['EXTRA_KEYS_3', 'EXTRA_KEYS_1', 'KEYED_ALIKE', 'LUBRICANT'] },
];

const byKey = Object.fromEntries(CATALOGUE.map((p) => [p.key, p]));

interface MegaMenuProps {
  id: string;
  open: boolean;
  onNavigate: () => void;
}

/** Desktop-only dropdown panel listing all 9 products grouped by category. */
export function MegaMenu({ id, open, onNavigate }: MegaMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id={id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute inset-x-0 top-full z-40 border-y border-cream-dark bg-warm-white shadow-[0_24px_48px_-24px_rgb(10_8_6/0.35)]"
        >
          <div className="container-wd grid grid-cols-4 gap-8 py-8">
            {MENU_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/75">{group.title}</h3>
                <ul className="space-y-1">
                  {group.keys.map((key) => {
                    const p = byKey[key];
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/products/${p.slug}`}
                          onClick={onNavigate}
                          className="group/item -mx-2 block rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-cream"
                        >
                          <span className="block text-[15px] font-medium text-near-black group-hover/item:text-red transition-colors duration-150">
                            {p.shortName}
                          </span>
                          <span className="block text-xs text-charcoal/75">{p.blurb}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="flex flex-col justify-between rounded-2xl bg-near-black p-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Not sure which size?</p>
                <p className="mt-2 font-playfair text-xl font-semibold leading-snug">Measure in 60 seconds with our sizing guide.</p>
              </div>
              <Link
                href="/products/3-star-alps-cylinder-door-lock#sizing"
                onClick={onNavigate}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white underline-offset-4 transition-colors duration-150 hover:text-red hover:underline"
              >
                Open the sizing guide
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
