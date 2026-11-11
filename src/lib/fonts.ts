import { Outfit } from 'next/font/google';

/**
 * Ultion sets everything in Sofia Pro (Adobe Fonts, paid, domain-locked — not copyable). Outfit is the closest open
 * face: measured x-height 98 %, cap-height 99 % and widths 101–103 % of Sofia Pro, same letter model (double-storey a,
 * single-storey g). See docs/ultion-typography-nav-spec.md. One variable file covers 300–900, replacing Inter + Playfair.
 */
export const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});
