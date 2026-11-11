import { WC_BASE } from '@/lib/constants';
import { sanitizeProductHtml } from '@/lib/sanitize';

/**
 * Read-only WordPress REST helpers (wp/v2) for the content pages: blog posts, terms, privacy.
 * Server-only. Cached with ISR; every helper returns null/[] on failure so pages degrade instead of erroring.
 */
const WP = `${WC_BASE}/wp-json/wp/v2`;
const REVALIDATE = 3600;
const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; WatchdogHeadless/1.0)', Accept: 'application/json' };

export interface WpImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface WpPost {
  id: number;
  slug: string;
  title: string;
  date: string;
  modified: string;
  excerpt: string;
  html: string;
  image: WpImage | null;
}

export interface WpPage {
  id: number;
  slug: string;
  title: string;
  modified: string;
  html: string;
}

interface RawRendered {
  rendered: string;
}
interface RawPost {
  id: number;
  slug: string;
  title: RawRendered;
  date: string;
  modified: string;
  excerpt: RawRendered;
  content: RawRendered;
  featured_media: number;
}
interface RawMedia {
  source_url: string;
  alt_text: string;
  media_details?: { width?: number; height?: number };
}

const decode = (s: string) => s.replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();

/** WordPress could not be reached (network, 5xx, rate limit). Pages let this propagate so Next shows the error page
 *  and retries on the next request, instead of caching a 404 or an empty list for an hour. */
export class WpUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WpUnavailableError';
  }
}

const ATTEMPTS = 3;
const TIMEOUT_MS = 12_000;

/** GET from the WP REST API with retries. Returns null only for a genuine 404; throws WpUnavailableError otherwise. */
async function get<T>(path: string): Promise<T | null> {
  let lastErr = 'unknown';
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(`${WP}${path}`, { headers, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
      lastErr = `HTTP ${res.status}`;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break; // not transient
    } catch (err) {
      lastErr = err instanceof Error ? err.message : 'network error';
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw new WpUnavailableError(`WordPress REST ${path}: ${lastErr}`);
}

/** Featured images are optional: a failed media lookup must not take the whole post down. */
async function media(id: number): Promise<WpImage | null> {
  if (!id) return null;
  let m: RawMedia | null;
  try {
    m = await get<RawMedia>(`/media/${id}?_fields=source_url,alt_text,media_details`);
  } catch {
    return null;
  }
  if (!m?.source_url) return null;
  return { src: m.source_url, width: m.media_details?.width ?? 1200, height: m.media_details?.height ?? 800, alt: m.alt_text || '' };
}

const POST_FIELDS = 'id,slug,title,date,modified,excerpt,content,featured_media';

async function toPost(p: RawPost): Promise<WpPost> {
  return {
    id: p.id,
    slug: p.slug,
    title: decode(p.title.rendered),
    date: p.date,
    modified: p.modified,
    excerpt: decode(p.excerpt.rendered),
    html: sanitizeProductHtml(p.content.rendered),
    image: await media(p.featured_media),
  };
}

export async function getPosts(): Promise<WpPost[]> {
  const raw = await get<RawPost[]>(`/posts?per_page=50&status=publish&orderby=date&order=desc&_fields=${POST_FIELDS}`);
  if (!raw) return [];
  return Promise.all(raw.map(toPost));
}

export async function getPost(slug: string): Promise<WpPost | null> {
  const raw = await get<RawPost[]>(`/posts?slug=${encodeURIComponent(slug)}&_fields=${POST_FIELDS}`);
  if (!raw?.[0]) return null;
  return toPost(raw[0]);
}

export async function getPage(slug: string): Promise<WpPage | null> {
  const raw = await get<Array<{ id: number; slug: string; title: RawRendered; modified: string; content: RawRendered }>>(`/pages?slug=${encodeURIComponent(slug)}&_fields=id,slug,title,modified,content`);
  const p = raw?.[0];
  if (!p) return null;
  return { id: p.id, slug: p.slug, title: decode(p.title.rendered), modified: p.modified, html: sanitizeProductHtml(p.content.rendered) };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
}
