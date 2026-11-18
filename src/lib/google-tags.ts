import { GOOGLE_TAGS_ENABLED } from './site-flags';

/**
 * Google tags, carried over from the WordPress site so Analytics, Ads conversions and Search Console keep working at
 * cutover (handover of 18 Nov 2026). The WordPress site loads:
 * - Tag Manager GTM-KMBS7ZK. Its container holds the Google Ads tag AW-17423822524 with four conversions, a second GA4
 *   property (G-5YLV9SVBZ5), Microsoft Clarity and a Meta pixel.
 * - GA4 G-HTQ28QJR8H directly (Site Kit), the property the traffic reports come from.
 * Ads is configured inside the container, so it is not added again here (that would double-count).
 *
 * Consent (src/lib/consent.ts), checked on every load and every change of choice:
 * - Nothing loads until the visitor accepts. Google consent mode starts with everything denied.
 * - "Analytics" loads GA4 G-HTQ28QJR8H.
 * - "Marketing" loads Tag Manager. The container mixes Ads, Meta and Clarity and their consent settings cannot be
 *   seen from here, so it waits for the marketing choice rather than firing on analytics alone.
 * - Withdrawing a choice after a script has loaded updates consent mode and reloads the page, because Meta and Clarity
 *   inside the container ignore consent mode and a loaded script cannot be unloaded.
 *
 * Only builds with GOOGLE_TAGS_ENABLED (the live site) do any of this; elsewhere every function here is a no-op.
 */

export const GTM_ID = 'GTM-KMBS7ZK';
export const GA4_ID = 'G-HTQ28QJR8H';

type DataLayer = unknown[];
type GtagWindow = Window & { dataLayer?: DataLayer; gtag?: (...args: unknown[]) => void };

const loaded = { ga4: false, gtm: false };

function w(): GtagWindow | null {
  return typeof window === 'undefined' ? null : (window as GtagWindow);
}

function dataLayer(win: GtagWindow): DataLayer {
  win.dataLayer = win.dataLayer ?? [];
  return win.dataLayer;
}

/** The standard gtag() shim: queues its arguments object on the dataLayer for gtag.js / Tag Manager to read. */
function gtag(...args: unknown[]): void {
  const win = w();
  if (!win) return;
  if (!win.gtag) {
    win.gtag = function gtagShim() {
      // eslint-disable-next-line prefer-rest-params -- gtag.js expects the arguments object itself, not an array
      dataLayer(win).push(arguments);
    };
    win.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    });
  }
  win.gtag(...args);
}

function addScript(src: string): void {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Brings the loaded tags in line with the visitor's cookie choice. Safe to call on every change. */
export function applyGoogleConsent(choice: { analytics: boolean; marketing: boolean }): void {
  if (!GOOGLE_TAGS_ENABLED || !w()) return;
  const withdrawn = (loaded.ga4 && !choice.analytics) || (loaded.gtm && !choice.marketing);
  gtag('consent', 'update', {
    analytics_storage: choice.analytics ? 'granted' : 'denied',
    ad_storage: choice.marketing ? 'granted' : 'denied',
    ad_user_data: choice.marketing ? 'granted' : 'denied',
    ad_personalization: choice.marketing ? 'granted' : 'denied',
  });
  if (withdrawn) {
    window.location.reload();
    return;
  }
  if (choice.analytics && !loaded.ga4) {
    loaded.ga4 = true;
    gtag('js', new Date());
    gtag('config', GA4_ID);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
  }
  if (choice.marketing && !loaded.gtm) {
    loaded.gtm = true;
    const win = w()!;
    dataLayer(win).push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    addScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
  }
}

/**
 * A finished order, for GA4 (the purchase event) and Tag Manager (dataLayer event "purchase" in the GA4 ecommerce
 * shape, which its Google Ads purchase conversion listens for). Sent once per order, even if the page is reloaded.
 * Queued events wait on the dataLayer and are sent only if the matching tag loads, so nothing leaves the browser
 * without consent.
 */
export function trackPurchase(order: { orderId: number; orderNumber: string; total: string; currency: string }): void {
  const win = w();
  if (!GOOGLE_TAGS_ENABLED || !win) return;
  const onceKey = `wd:tracked-order:${order.orderId}`;
  try {
    if (window.sessionStorage.getItem(onceKey)) return;
    window.sessionStorage.setItem(onceKey, '1');
  } catch {
    // Storage blocked: send anyway; a duplicate is better than a missed conversion.
  }
  const ecommerce = { transaction_id: order.orderNumber, value: Number(order.total) || 0, currency: order.currency || 'GBP' };
  if (loaded.ga4) gtag('event', 'purchase', ecommerce);
  dataLayer(win).push({ ecommerce: null });
  dataLayer(win).push({ event: 'purchase', ecommerce });
}

/** Names of the forms that report a successful send. */
export type TrackedForm = 'contact_callback' | 'contact_message' | 'trade_application' | 'guarantee_registration';

/**
 * A form sent successfully: GA4 generate_lead, and dataLayer event "form_submit" with form_name for Tag Manager. The
 * old site's Ads conversions fired on the /contact-us/ and /trade-application/ pages; on this site those are /contact
 * and /trade, so the container's triggers need pointing at these events (see the PR notes).
 */
export function trackFormSent(form: TrackedForm): void {
  const win = w();
  if (!GOOGLE_TAGS_ENABLED || !win) return;
  if (loaded.ga4) gtag('event', 'generate_lead', { form_name: form });
  dataLayer(win).push({ event: 'form_submit', form_name: form });
}
