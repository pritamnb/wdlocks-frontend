/**
 * Search-result descriptions for the product pages, from the redirects and SEO handover (18 Nov 2026). WooCommerce's
 * short descriptions make poor snippets (placeholders such as "This lock comes with 3 keys as standard", or text cut off
 * mid-sentence), so these take priority. The two cylinder locks reuse the old Rank Math text; the rest were written
 * from facts on each product page. A product not listed falls back to its WooCommerce description.
 */
export const PRODUCT_META_DESCRIPTIONS: Record<string, string> = {
  '3-star-alps-cylinder-door-lock':
    'Shop the Watchdog 3 Star ALPS Euro Cylinder Door Lock with key. BSI TS007 3 Star anti-snap, anti-pick & anti-drill protection for homes and businesses. Fast UK delivery.',
  '3-star-alps-euro-cylinder-thumb-turn-lock':
    'Upgrade your door security with the Watchdog 3 Star ALPS Euro Cylinder Thumb Turn Lock. BSI TS007 3 Star anti-snap, anti-pick & anti-drill protection with fast UK delivery.',
  'watchdog-3-star-alps-half-cylinder-lock-10-35':
    'Watchdog 3 Star ALPS half euro cylinder (10/35), BSI Kitemark 3 Star TS007, for garage doors, roller shutters, key switches and doors keyed from one side.',
  'watchdog-rim-cylinder':
    'Watchdog replacement rim cylinder for timber doors with a night latch, in brass or nickel finish. Supplied with 3 keys.',
  'watchdog-keyed-a-like':
    'Run several Watchdog euro cylinder locks on one key. Order your locks keyed alike, so a single key opens every lock in the set.',
  'watchdog-3-star-alps-extra-keys':
    'Genuine extra keys for your Watchdog 3 Star ALPS lock, cut against your key number. Non-genuine keys can damage the lock and void your guarantee.',
  'watchdog-1-star-alps-extra-keys':
    'Replacement Watchdog 1 Star Series keys, cut to code. Enter the key code from your existing key or key card when you order.',
  'watchdog-3-star-alps-lock-lubricant':
    'Lock lubricant for Watchdog 3 Star ALPS cylinders. Use it every 6 months to keep your guarantee valid.',
  'bruno-teddy-protection-car-key-signal-blocker':
    "Bruno Teddy car key signal blocker: RFID/Faraday shielding inside a plush teddy blocks your key fob's signal to help stop keyless relay theft.",
};
