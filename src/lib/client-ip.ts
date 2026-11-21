/**
 * The visitor's IP address as the hosting platform saw it, for rate limiting and the Turnstile check.
 *
 * Only headers that the platform or our own reverse proxy writes can be trusted. The FIRST X-Forwarded-For hop is
 * whatever the client sent, so keying a limit on it lets anyone get a fresh bucket per request by sending a made-up
 * header. Which header is trustworthy depends on where the app runs:
 *
 * - Vercel (VERCEL=1, set by the platform): `x-vercel-forwarded-for`, then `x-real-ip`. Vercel overwrites both.
 * - `CLIENT_IP_HEADER=<name>`: one header that the proxy in front of Next OVERWRITES with the peer address, e.g.
 *   `x-real-ip` (nginx `proxy_set_header X-Real-IP $remote_addr`) or `cf-connecting-ip` (behind Cloudflare).
 * - Otherwise X-Forwarded-For counted from the RIGHT: each trusted proxy appends the address it received the request
 *   from, so with `TRUSTED_PROXY_COUNT=N` (default 1) the Nth entry from the right is the address the outermost trusted
 *   proxy saw. Entries further left were written by the client and are ignored.
 *
 * docs/developer-guide.md "Abuse protection" documents the setting for the client's host.
 */

const MAX_IP_LENGTH = 64;
/** IPv4 / IPv6 characters only (optionally bracketed, with a port). Anything else is not an address we key on. */
const IP_CHARS = /^[0-9A-Fa-f:.[\]%]+$/;

function normalise(value: string | null | undefined): string | null {
  if (!value) return null;
  let v = value.trim();
  if (!v || v.length > MAX_IP_LENGTH || !IP_CHARS.test(v)) return null;
  // "[2001:db8::1]:443" → "2001:db8::1"; "203.0.113.7:51234" → "203.0.113.7"
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(v);
  if (bracketed) v = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(v)) v = v.slice(0, v.lastIndexOf(':'));
  return v.toLowerCase();
}

function trustedProxyCount(): number {
  const n = Number(process.env.TRUSTED_PROXY_COUNT ?? '1');
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 1;
}

/** Nth address from the right of X-Forwarded-For (the leftmost one when the chain is shorter than N). */
export function rightmostForwardedFor(header: string | null, hops: number): string | null {
  if (!header) return null;
  const parts = header.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return normalise(parts[Math.max(0, parts.length - hops)]);
}

export type ClientIpSource = { kind: 'vercel' } | { kind: 'header'; name: string } | { kind: 'xff'; hops: number };

export function clientIpSource(env: NodeJS.ProcessEnv = process.env): ClientIpSource {
  const header = env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (header) return { kind: 'header', name: header };
  if (env.VERCEL === '1') return { kind: 'vercel' };
  return { kind: 'xff', hops: trustedProxyCount() };
}

/** The client's address, or 'unknown' when the trusted header is missing (every such request then shares a bucket). */
export function clientIp(req: Request, source: ClientIpSource = clientIpSource()): string {
  const h = req.headers;
  let ip: string | null = null;
  switch (source.kind) {
    case 'vercel':
      ip = normalise(h.get('x-vercel-forwarded-for')?.split(',')[0]) ?? normalise(h.get('x-real-ip'));
      break;
    case 'header':
      ip = normalise(h.get(source.name)?.split(',')[0]);
      break;
    case 'xff':
      ip = rightmostForwardedFor(h.get('x-forwarded-for'), source.hops) ?? normalise(h.get('x-real-ip'));
      break;
  }
  return ip ?? 'unknown';
}
