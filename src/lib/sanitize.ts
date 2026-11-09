/**
 * Minimal HTML sanitiser for WooCommerce product descriptions (trusted-ish source: the client's own
 * WordPress). Removes scripts/styles/iframes, event handlers and javascript: URLs. Not a general-purpose
 * sanitiser — do not use on arbitrary user content.
 */
export function sanitizeProductHtml(html: string): string {
  return html
    .replace(/<\/?(script|style|iframe|object|embed|form|input|link|meta)\b[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/<img\b([^>]*?)\s(width|height)\s*=\s*("[^"]*"|'[^']*'|\d+)/gi, '<img$1')
    .replace(/<img\b([^>]*?)\s(width|height)\s*=\s*("[^"]*"|'[^']*'|\d+)/gi, '<img$1')
    .replace(/<img\b/gi, '<img loading="lazy" decoding="async"');
}
