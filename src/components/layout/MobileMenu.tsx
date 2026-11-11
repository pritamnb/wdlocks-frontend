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
    <Modal open={open} onClose={onClose} variant="left" labelledBy="mobile-menu-title" className="flex flex-col !bg-near-black text-white !w-full !max-w-none">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 id="mobile-menu-title" className="sr-only">Site navigation</h2>
        <Logo tone="light" />
        <CloseButton onClick={onClose} label="Close menu" className="!text-white hover:!bg-white/10" />
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin" aria-label="Mobile">
        <ul className="divide-y divide-white/10">
          {NAV_LINKS.map((l) =>
            l.menu ? (
              <li key={l.label}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-4 text-left text-2xl font-semibold text-white"
                  aria-expanded={expanded === l.menu}
                  onClick={() => setExpanded((e) => (e === l.menu ? null : l.menu))}
                >
                  {l.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('text-red transition-transform duration-150', expanded === l.menu && 'rotate-180')}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {expanded === l.menu && (
                  <ul className="mb-4 space-y-3">
                    {MENU_GROUPS[l.menu].featured.map((key) => {
                      const entry = byKey[key];
                      const img = productById.get(entry.id)?.images[0];
                      return (
                        <li key={entry.id} className="flex items-center gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-warm-white">
                            {img && <Image src={img.thumbnail || img.src} alt="" fill sizes="56px" className="object-contain p-1.5" />}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/products/${entry.slug}`} onClick={onClose} className="block text-lg font-semibold leading-tight text-white">{entry.shortName}</Link>
                            <div className="mt-1 flex gap-4 text-sm font-medium text-red">
                              <Link href={`/products/${entry.slug}#sizing`} onClick={onClose}>Buy online</Link>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {MENU_GROUPS[l.menu].more.map((m) => (
                      <li key={m.label}>
                        {m.external ? (
                          <a href={m.href} rel="noopener" className="block py-1 text-base text-white/75 hover:text-red">{m.label} ↗</a>
                        ) : (
                          <Link href={m.href} onClick={onClose} className="block py-1 text-base text-white/75 hover:text-red">{m.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={l.label}>
                <Link href={l.href} onClick={onClose} className="block py-4 text-2xl font-semibold text-white hover:text-red">
                  {l.label}
                </Link>
              </li>
            ),
          )}
        </ul>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">Most viewed</p>
          <ul className="mt-3 space-y-2">
            {MOST_VIEWED.map((m) =>
              'external' in m && m.external ? (
                <li key={m.label}><a href={m.href} rel="noopener" className="text-base font-medium text-white hover:text-red">{m.label} ↗</a></li>
              ) : (
                <li key={m.label}><Link href={m.href} onClick={onClose} className="text-base font-medium text-white hover:text-red">{m.label}</Link></li>
              ),
            )}
          </ul>
        </div>

        <div className="mt-8 text-sm text-white/70">
          <a href={SITE.phoneHref} className="block font-medium text-white">{SITE.phone}</a>
          <a href={`mailto:${SITE.email}`} className="block">{SITE.email}</a>
        </div>
      </nav>
      <div className="border-t border-white/10 bg-near-black p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <a
          href={GUARANTEE.href}
          className="flex h-12 w-full items-center justify-center rounded-full bg-red text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep"
        >
          Activate your {GUARANTEE.amountLabel} guarantee
        </a>
      </div>
    </Modal>
  );
}
