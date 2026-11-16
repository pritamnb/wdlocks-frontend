import sanitizeHtml from 'sanitize-html';
import { BRAND_VIDEO } from '@/lib/constants';

/**
 * Allowlist for the WordPress HTML the site renders: product descriptions, blog posts, the privacy and terms pages.
 * It covers every tag and attribute that content uses today (a census of the live content, Nov 2026) and nothing that
 * can run script: no event handlers, no style attributes, no iframes/forms/svg, links limited to http(s)/mailto/tel.
 * It is parser-based (sanitize-html → htmlparser2), so the tricks that beat the old regex filter
 * (`<img/onerror=…>`, unquoted or entity-encoded `javascript:` URLs) are dropped.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'div', 'span', 'section', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'abbr', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'img', 'figure', 'figcaption',
    'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'details', 'summary',
  ],
  allowedAttributes: {
    '*': ['class', 'id', 'title', 'aria-label', 'aria-describedby'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'srcset', 'sizes', 'alt', 'loading', 'decoding'],
    details: ['open'],
    ol: ['start', 'reversed', 'type'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    // Width/height come from WordPress's own layout; the prose styles size images responsively instead.
    img: (tagName, attribs) => {
      const rest = { ...attribs };
      delete rest.width;
      delete rest.height;
      return { tagName, attribs: { ...rest, loading: 'lazy', decoding: 'async' } };
    },
    // A link that opens a new tab must not hand that tab a handle on this page.
    a: (tagName, attribs) => (attribs.target === '_blank' ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } } : { tagName, attribs }),
  },
};

/**
 * Sanitises HTML from the client's WordPress (product descriptions, posts, pages) before it is rendered with
 * dangerouslySetInnerHTML. Also tidies two WordPress quirks and puts the manufacturer film into the ALPS lock copy.
 */
export function sanitizeProductHtml(html: string): string {
  // WordPress wraps CSS the editor pasted as plain text in <p>…</p> (wpautop). Drop paragraphs that
  // are CSS rules, e.g. ".watchdog-video-wrapper { position: relative; … }". (Removal only, before sanitising.)
  const withoutCss = html.replace(/<p\b[^>]*>\s*[.#@:\w][^<{}]{0,200}\{[\s\S]*?\}\s*<\/p>/gi, '');
  return (
    sanitizeHtml(withoutCss, OPTIONS)
      // WordPress strips the YouTube iframe from the Store API output, leaving an empty
      // .watchdog-video-wrapper inside "Watch how the ALPS lock works". Put the manufacturer film there
      // (our own markup, added after sanitising).
      .replace(
        /<div class="watchdog-video-wrapper">\s*<\/div>/gi,
        `<video class="watchdog-inline-film" controls preload="none" playsinline poster="${BRAND_VIDEO.film.poster}" src="${BRAND_VIDEO.film.mp4}" aria-label="${BRAND_VIDEO.film.title}"></video>`,
      )
  );
}
