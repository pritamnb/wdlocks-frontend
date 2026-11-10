'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { WooProduct } from '@/types';
import { Modal, CloseButton } from '@/components/ui/Modal';
import { Logo } from '@/components/layout/Logo';
import { CATALOGUE, GUARANTEE, MENU_GROUPS, MOST_VIEWED, NAV_LINKS, SITE, type MenuGroupId } from '@/lib/constants';
import { cn } from '@/lib/cn';

const byKey = Object.fromEntries(CATALOGUE.map((p) => [p.key, p]));

export function MobileMenu({ open, onClose, products }: { open: boolean; onClose: () => void; products: WooProduct[] }) {
  const [expanded, setExpanded] = React.useState<MenuGroupId | null>('locks');
  const productById = new Map(products.map((p) => [p.id, p]));

  return (
    <Modal open={open} onClose={onClose} variant="left" labelledBy="mobile-menu-title" className="flex flex-col">
      <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
        <h2 id="mobile-menu-title" className="sr-only">Site navigation</h2>
        <Logo />
        <CloseButton onClick={onClose} label="Close menu" />
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin" aria-label="Mobile">
        <ul className="divide-y divide-cream-dark">
          {NAV_LINKS.map((l) =>
            l.menu ? (
              <li key={l.label}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3.5 text-left text-lg font-semibold text-near-black"
                  aria-expanded={expanded === l.menu}
                  onClick={() => setExpanded((e) => (e === l.menu ? null : l.menu))}
                >
                  {l.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('text-red transition-transform duration-150', expanded === l.menu && 'rotate-180')}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {expanded === l.menu && (
                  <ul className="mb-3 grid grid-cols-2 gap-2">
                    {MENU_GROUPS[l.menu].featured.map((key) => {
                      const entry = byKey[key];
                      const img = productById.get(entry.id)?.images[0];
                      return (
                        <li key={entry.id} className="group">
                          <Link href={`/products/${entry.slug}`} onClick={onClose} className="block overflow-hidden rounded-xl border border-cream-dark bg-cream">
                            <div className="relative h-20 bg-warm-white">
                              {img && <Image src={img.thumbnail || img.src} alt="" fill sizes="160px" className="brighten-img object-contain p-2" />}
                            </div>
                            <p className="px-2.5 py-2 text-sm font-semibold leading-tight text-near-black">{entry.shortName}</p>
                          </Link>
                        </li>
                      );
                    })}
                    {MENU_GROUPS[l.menu].more.map((m) => (
                      <li key={m.label} className="col-span-2">
                        {m.external ? (
                          <a href={m.href} rel="noopener" className="block px-1 py-1.5 text-sm text-charcoal/80 hover:text-red">{m.label} ↗</a>
                        ) : (
                          <Link href={m.href} onClick={onClose} className="block px-1 py-1.5 text-sm text-charcoal/80 hover:text-red">{m.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={l.label}>
                <Link href={l.href} onClick={onClose} className="block py-3.5 text-lg font-semibold text-near-black hover:text-red">
                  {l.label}
                </Link>
              </li>
            ),
          )}
        </ul>

        <div className="mt-5">
          <span className="inline-block rounded-full bg-red px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">Most viewed</span>
          <ul className="mt-3 space-y-2">
            {MOST_VIEWED.map((m) =>
              'external' in m && m.external ? (
                <li key={m.label}><a href={m.href} rel="noopener" className="text-[15px] font-medium text-near-black underline decoration-cream-dark underline-offset-4 hover:text-red hover:decoration-red">{m.label} ↗</a></li>
              ) : (
                <li key={m.label}><Link href={m.href} onClick={onClose} className="text-[15px] font-medium text-near-black underline decoration-cream-dark underline-offset-4 hover:text-red hover:decoration-red">{m.label}</Link></li>
              ),
            )}
          </ul>
        </div>

        <div className="mt-6 text-sm text-charcoal/80">
          <a href={SITE.phoneHref} className="block font-medium text-near-black">{SITE.phone}</a>
          <a href={`mailto:${SITE.email}`} className="block">{SITE.email}</a>
        </div>
      </nav>
      <div className="border-t border-cream-dark bg-warm-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <a
          href={GUARANTEE.registerUrl}
          rel="noopener"
          className="flex h-12 w-full items-center justify-center rounded-full bg-red text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep"
        >
          Activate your {GUARANTEE.amountLabel} guarantee
        </a>
      </div>
    </Modal>
  );
}
