'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { WooProduct } from '@/types';
import { Logo } from '@/components/layout/Logo';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { useCart } from '@/hooks/useCart';
import { GUARANTEE, NAV_LINKS, type MenuGroupId } from '@/lib/constants';
import { cn } from '@/lib/cn';

const MEGA_ID = 'primary-mega-menu';

export function Navbar({ products }: { products: WooProduct[] }) {
  const pathname = usePathname();
  const { itemCount, openCart, status } = useCart();
  const [openGroup, setOpenGroup] = React.useState<MenuGroupId | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const headerRef = React.useRef<HTMLElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menus on route change (derived during render, no effect needed)
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpenGroup(null);
    setMobileOpen(false);
  }

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    if (!openGroup) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenGroup(null);
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [openGroup]);

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenGroup(null), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <header
      ref={headerRef}
      className={cn(
        'relative z-40 border-b bg-warm-white text-near-black transition-[box-shadow,border-color] duration-150',
        scrolled ? 'border-cream-dark shadow-[0_8px_24px_-16px_rgb(10_8_6/0.35)]' : 'border-cream-dark',
      )}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenGroup(null);
      }}
    >
      <div className="container-wd flex h-16 items-center justify-between gap-3 sm:h-[72px]">
        <button
          type="button"
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-near-black transition-colors duration-150 hover:bg-cream-mid lg:hidden"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <Logo priority className="lg:mr-4" />

        <nav className="hidden flex-1 lg:block" aria-label="Primary">
          <ul className="flex items-center gap-0.5">
            {NAV_LINKS.map((link) =>
              link.menu ? (
                <li
                  key={link.label}
                  onMouseEnter={() => { cancelClose(); setOpenGroup(link.menu); }}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    className={cn(
                      'inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-sm font-medium transition-colors duration-150 hover:bg-cream-mid hover:text-red',
                      openGroup === link.menu ? 'text-red' : 'text-near-black',
                    )}
                    aria-expanded={openGroup === link.menu}
                    aria-controls={MEGA_ID}
                    aria-haspopup="true"
                    onClick={() => setOpenGroup((g) => (g === link.menu ? null : link.menu))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setOpenGroup(link.menu);
                        requestAnimationFrame(() => document.getElementById(MEGA_ID)?.querySelector<HTMLElement>('a')?.focus());
                      }
                    }}
                  >
                    {link.label}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('transition-transform duration-150', openGroup === link.menu && 'rotate-180')}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </li>
              ) : (
                <li key={link.label}>
                  <Link href={link.href} className="inline-flex h-10 items-center rounded-full px-3.5 text-sm font-medium text-near-black transition-colors duration-150 hover:bg-cream-mid hover:text-red">
                    {link.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={GUARANTEE.href}
            className="hidden h-10 items-center rounded-full bg-red px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-deep md:inline-flex"
          >
            Activate {GUARANTEE.amountLabel} guarantee
          </a>
          <button
            type="button"
            onClick={openCart}
            className="relative -mr-2 inline-flex h-10 items-center gap-2 rounded-full px-3 text-near-black transition-colors duration-150 hover:bg-cream-mid"
            aria-label={`Open basket, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            aria-haspopup="dialog"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 7h12l1 13H5L6 7Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            <span className="hidden text-sm font-medium sm:inline">Basket</span>
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1 text-[11px] font-semibold text-white ring-2 ring-warm-white transition-transform duration-150',
                itemCount === 0 && status !== 'loading' ? 'scale-0' : 'scale-100',
              )}
              aria-hidden="true"
            >
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          </button>
        </div>
      </div>

      <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose} className="hidden lg:block">
        <MegaMenu id={MEGA_ID} group={openGroup} products={products} onNavigate={() => setOpenGroup(null)} />
      </div>
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} products={products} />
    </header>
  );
}
