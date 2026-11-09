'use client';

import Link from 'next/link';
import { Modal, CloseButton } from '@/components/ui/Modal';
import { Logo } from '@/components/layout/Logo';
import { MENU_GROUPS } from '@/components/layout/MegaMenu';
import { CATALOGUE, NAV_LINKS, SITE } from '@/lib/constants';

const byKey = Object.fromEntries(CATALOGUE.map((p) => [p.key, p]));

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} variant="left" labelledBy="mobile-menu-title" className="flex flex-col">
      <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
        <h2 id="mobile-menu-title" className="sr-only">Site navigation</h2>
        <Logo />
        <CloseButton onClick={onClose} label="Close menu" />
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin" aria-label="Mobile">
        <ul className="space-y-1">
          {NAV_LINKS.filter((l) => !l.megaMenu).map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onClose}
                className="block rounded-lg px-2 py-3 text-base font-medium text-near-black transition-colors duration-150 hover:bg-cream"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-cream-dark pt-4">
          <Link href="/products" onClick={onClose} className="block px-2 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/60 hover:text-red">
            All products →
          </Link>
          {MENU_GROUPS.map((group) => (
            <div key={group.title} className="mt-3">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/50">{group.title}</p>
              <ul className="mt-1">
                {group.keys.map((key) => {
                  const p = byKey[key];
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/products/${p.slug}`}
                        onClick={onClose}
                        className="block rounded-lg px-2 py-2.5 text-[15px] text-near-black transition-colors duration-150 hover:bg-cream"
                      >
                        {p.shortName}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <div className="border-t border-cream-dark px-4 py-4 text-sm text-charcoal/80">
        <a href={SITE.phoneHref} className="block font-medium text-near-black">{SITE.phone}</a>
        <a href={`mailto:${SITE.email}`} className="block">{SITE.email}</a>
      </div>
    </Modal>
  );
}
