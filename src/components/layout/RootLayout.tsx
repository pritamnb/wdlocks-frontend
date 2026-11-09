import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { CartProvider } from '@/hooks/useCart';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';

/**
 * Site chrome: providers + announcement bar + navbar + page + footer + cart drawer.
 * Fonts are attached to <html> in app/layout.tsx (next/font must run there).
 */
export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-near-black focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AnnouncementBar />
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <CartDrawer />
      </CartProvider>
    </ToastProvider>
  );
}
