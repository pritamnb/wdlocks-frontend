/**
 * Build-time facts about which address this build serves. No imports, so next.config.ts can use it too.
 *
 * Only a build for the real shop address is indexed by search engines and loads the Google tags. Every other build
 * (wdlocks-frontend.vercel.app, the -staging copy, new.wdlocks.co.uk while it is a test name, localhost) says noindex
 * and sends nothing to Google, so test traffic never reaches the client's Analytics or Ads accounts and the copies
 * never compete with the real site in search results.
 */

/** The real shop address. A build whose NEXT_PUBLIC_SITE_URL is exactly this is the live site. */
export const PRODUCTION_SITE_URL = 'https://wdlocks.co.uk';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** True only for the build that serves https://wdlocks.co.uk. */
export const IS_PRODUCTION_SITE = SITE_URL === PRODUCTION_SITE_URL;

/**
 * Whether the Google tags (Tag Manager + GA4, src/lib/google-tags.ts) are part of this build. On for the live site,
 * off elsewhere. NEXT_PUBLIC_GOOGLE_TAGS=on turns them on for a test build (e.g. to check them in Tag Assistant),
 * =off turns them off on the live site. Even when on, nothing loads until the visitor accepts cookies.
 */
const GOOGLE_TAGS_SETTING = process.env.NEXT_PUBLIC_GOOGLE_TAGS?.trim().toLowerCase();
export const GOOGLE_TAGS_ENABLED = GOOGLE_TAGS_SETTING === 'on' || (IS_PRODUCTION_SITE && GOOGLE_TAGS_SETTING !== 'off');
