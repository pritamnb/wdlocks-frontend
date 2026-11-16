/**
 * Which forms the Turnstile check protects, shared by the browser hook and the server check so both always agree.
 *
 * Set by NEXT_PUBLIC_TURNSTILE_FORMS (a build-time value, like the site key): a comma list of `checkout`, `contact`,
 * `trade`, `guarantee`, or `all` / `none`. Unset means all. A list with an unknown name also means all, so a typo
 * never removes protection silently (the server logs it).
 */
export const TURNSTILE_FORMS = ['checkout', 'contact', 'trade', 'guarantee'] as const;
export type TurnstileAction = (typeof TURNSTILE_FORMS)[number];

export interface TurnstileFormsConfig {
  forms: ReadonlySet<TurnstileAction>;
  /** False when the value had an unknown name and fell back to all forms. */
  valid: boolean;
}

export function parseTurnstileForms(raw: string | undefined): TurnstileFormsConfig {
  const all: ReadonlySet<TurnstileAction> = new Set(TURNSTILE_FORMS);
  const value = raw?.trim().toLowerCase();
  if (!value || value === 'all') return { forms: all, valid: true };
  if (value === 'none') return { forms: new Set(), valid: true };
  const names = value.split(',').map((n) => n.trim()).filter(Boolean);
  const known = (n: string): n is TurnstileAction => (TURNSTILE_FORMS as readonly string[]).includes(n);
  if (names.length === 0 || !names.every(known)) return { forms: all, valid: false };
  return { forms: new Set(names as TurnstileAction[]), valid: true };
}
