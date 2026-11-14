import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { CartProvider } from '@/hooks/useCart';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ConsentProvider } from '@/hooks/useConsent';
import { CookieConsent } from '@/components/layout/CookieConsent';
import { getMenuProductsSSR } from '@/lib/api';

/**
 * Site chrome: providers + announcement bar + navbar + page + footer + cookie consent + cart drawer.
 * Products are fetched here (ISR 60s) so the mega-menu, mobile menu and basket upsells
 * can show live images and prices without a client fetch.
 */
export async function RootLayout({ children }: { children: ReactNode }) {
  const products = await getMenuProductsSSR();
  return (
    <ToastProvider>
      <CartProvider products={products}>
        <ConsentProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-near-black focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <div className="sticky top-0 z-40">
            <Navbar products={products} />
            <AnnouncementBar />
          </div>
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <CookieConsent />
          <CartDrawer products={products} />
        </ConsentProvider>
      </CartProvider>
    </ToastProvider>
  );
}
