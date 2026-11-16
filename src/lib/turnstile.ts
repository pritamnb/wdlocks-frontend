/**
 * Cloudflare Turnstile, server side: checks the token the browser sends in the `X-Turnstile-Token` header with
 * Cloudflare's siteverify endpoint. The browser half is src/hooks/useTurnstile.tsx.
 *
 * Switched on only when BOTH NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set, so a half-configured
 * deploy never locks people out of the forms. NEXT_PUBLIC_TURNSTILE_FORMS picks which forms are checked (default all;
 * src/lib/turnstile-forms.ts). Each form passes its own `action`, and a token minted for one form is refused by the
 * others.
 *
 * Turnstile is a security measure the visitor's own request needs (ICO: "strictly necessary"), so it runs whatever
 * the cookie choice is; the script loads only on pages with a protected form, when the form mounts.
 */
import { clientIp } from '@/lib/client-ip';
import { parseTurnstileForms, type TurnstileAction } from '@/lib/turnstile-forms';

export type { TurnstileAction };
export const TURNSTILE_HEADER = 'x-turnstile-token';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5_000;
/** Cloudflare documents tokens of up to 2048 characters. */
const MAX_TOKEN_LENGTH = 2048;

export function isTurnstileEnabled(): boolean {
  // Written out in full: Next inlines `process.env.NEXT_PUBLIC_…` at build time only for this literal form, and the
  // browser gets the site key from the build, so the server must judge by the same build-time value.
  return !!process.env.TURNSTILE_SECRET_KEY?.trim() && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
}

let formsWarned = false;

/** True when Turnstile is on and NEXT_PUBLIC_TURNSTILE_FORMS includes this form. */
export function isTurnstileRequired(action: TurnstileAction): boolean {
  if (!isTurnstileEnabled()) return false;
  const { forms, valid } = parseTurnstileForms(process.env.NEXT_PUBLIC_TURNSTILE_FORMS);
  if (!valid && !formsWarned) {
    formsWarned = true;
    console.error('[turnstile] NEXT_PUBLIC_TURNSTILE_FORMS has an unknown form name; checking all forms');
  }
  return forms.has(action);
}

export type TurnstileResult = { ok: true } | { ok: false; reason: 'missing' | 'rejected' | 'wrong-action' };

interface SiteverifyReply {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Verifies the request's token for `action`. Resolves `{ ok: true }` when Turnstile is off or not set for this form.
 * Fails open (logged) only when Cloudflare itself cannot be reached: an attacker cannot cause that, and closing the
 * checkout during a Cloudflare outage would cost real orders; the rate limits still apply.
 */
export async function verifyTurnstile(req: Request, action: TurnstileAction): Promise<TurnstileResult> {
  if (!isTurnstileRequired(action)) return { ok: true };
  const token = req.headers.get(TURNSTILE_HEADER)?.trim();
  if (!token || token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: 'missing' };

  const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!.trim(), response: token });
  const ip = clientIp(req);
  if (ip !== 'unknown') form.set('remoteip', ip);

  let reply: SiteverifyReply;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`siteverify answered ${res.status}`);
    reply = (await res.json()) as SiteverifyReply;
  } catch (err) {
    console.error('[turnstile] siteverify unreachable, allowing request', { action, error: err instanceof Error ? err.message : 'unknown error' });
    return { ok: true };
  }

  if (!reply.success) {
    console.warn('[turnstile] token rejected', { action, codes: reply['error-codes'] });
    return { ok: false, reason: 'rejected' };
  }
  // Cloudflare's test keys answer with an empty action; real widgets always echo the one they were rendered with.
  if (reply.action && reply.action !== action) {
    console.warn('[turnstile] token for another form', { action, got: reply.action });
    return { ok: false, reason: 'wrong-action' };
  }
  return { ok: true };
}

export const TURNSTILE_FAILED_MESSAGE = 'The security check did not go through. Please try again, or refresh the page if it keeps happening.';
