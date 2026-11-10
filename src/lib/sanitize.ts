import { BRAND_VIDEO } from '@/lib/constants';

/**
 * Minimal HTML sanitiser for WooCommerce product descriptions (trusted-ish source: the client's own
 * WordPress). Removes scripts/styles/iframes, event handlers and javascript: URLs. Not a general-purpose
 * sanitiser — do not use on arbitrary user content.
 */
export function sanitizeProductHtml(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|form|input|link|meta)\b[^>]*>/gi, '')
    // WordPress wraps CSS the editor pasted as plain text in <p>…</p> (wpautop). Drop paragraphs that
    // are CSS rules, e.g. ".watchdog-video-wrapper { position: relative; … }".
    .replace(/<p\b[^>]*>\s*[.#@:\w][^<{}]{0,200}\{[\s\S]*?\}\s*<\/p>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/<img\b([^>]*?)\s(width|height)\s*=\s*("[^"]*"|'[^']*'|\d+)/gi, '<img$1')
    .replace(/<img\b([^>]*?)\s(width|height)\s*=\s*("[^"]*"|'[^']*'|\d+)/gi, '<img$1')
    .replace(/<img\b/gi, '<img loading="lazy" decoding="async"')
    // WordPress strips the YouTube iframe from the Store API output, leaving an empty
    // .watchdog-video-wrapper inside "Watch how the ALPS lock works". Put the manufacturer film there.
    .replace(
      /<div class="watchdog-video-wrapper">\s*<\/div>/gi,
      `<video class="watchdog-inline-film" controls preload="none" playsinline poster="${BRAND_VIDEO.film.poster}" src="${BRAND_VIDEO.film.mp4}" aria-label="${BRAND_VIDEO.film.title}"></video>`,
    );
}
