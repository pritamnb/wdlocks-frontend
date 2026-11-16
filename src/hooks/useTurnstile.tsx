'use client';

/**
 * Cloudflare Turnstile, browser side (server side: src/lib/turnstile.ts). Off unless NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is set at build time, and only for the forms NEXT_PUBLIC_TURNSTILE_FORMS lists (default all). For any other form
 * `widget` is null and `getToken()` resolves null, and the form behaves as before.
 *
 * When on, Cloudflare's script is loaded the first time a protected form mounts (never site-wide) and the widget runs
 * in "execute" mode with appearance "interaction-only": it stays invisible, and a checkbox appears in `widget` only
 * when Cloudflare wants a click. `getToken()` asks for a fresh single-use token for each submission.
 *
 * This is a security check for the visitor's own request (strictly necessary), so it does not wait for cookie consent.
 */
import * as React from 'react';
import { parseTurnstileForms, type TurnstileAction } from '@/lib/turnstile-forms';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
const FORMS = parseTurnstileForms(process.env.NEXT_PUBLIC_TURNSTILE_FORMS).forms;
/** True when at least one form is protected (the cookie popup mentions the check then). */
export const TURNSTILE_ENABLED = SITE_KEY !== '' && FORMS.size > 0;
export const TURNSTILE_HEADER = 'X-Turnstile-Token';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** A visible challenge waits for the visitor; give up after two minutes. */
const TOKEN_TIMEOUT_MS = 120_000;

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export class TurnstileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TurnstileError';
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new TurnstileError('Turnstile did not start')));
      script.onerror = () => {
        scriptPromise = null; // let a later submission try again
        script.remove();
        reject(new TurnstileError('Turnstile could not load'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface Pending {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface TurnstileHandle {
  /** Where Cloudflare shows a checkbox when it needs one; null when Turnstile is off. */
  widget: React.ReactNode;
  /** A fresh token for one submission; null when Turnstile is off. Rejects with TurnstileError when the check fails. */
  getToken: () => Promise<string | null>;
}

export function useTurnstile(action: TurnstileAction): TurnstileHandle {
  const enabled = TURNSTILE_ENABLED && FORMS.has(action);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetRef = React.useRef<Promise<{ api: TurnstileApi; id: string }> | null>(null);
  const pendingRef = React.useRef<Pending | null>(null);

  const settle = React.useCallback((outcome: { token: string } | { error: string }) => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    clearTimeout(pending.timer);
    if ('token' in outcome) pending.resolve(outcome.token);
    else pending.reject(new TurnstileError(outcome.error));
  }, []);

  /** Renders the widget into the mounted slot once; later calls share the same promise. */
  const ensureWidget = React.useCallback(() => {
    if (!widgetRef.current) {
      widgetRef.current = loadScript().then((api) => {
        const el = containerRef.current;
        if (!el) throw new TurnstileError('Turnstile container is not mounted');
        const id = api.render(el, {
          sitekey: SITE_KEY,
          action,
          execution: 'execute',
          appearance: 'interaction-only',
          'refresh-expired': 'manual',
          callback: (token: string) => settle({ token }),
          'error-callback': () => {
            settle({ error: 'Turnstile check failed' });
            return true; // handled: Cloudflare stops its own retry loop and we ask again on the next submission
          },
          'timeout-callback': () => settle({ error: 'Turnstile check timed out' }),
        });
        return { api, id };
      });
      widgetRef.current.catch(() => {
        widgetRef.current = null;
      });
    }
    return widgetRef.current;
  }, [action, settle]);

  /** Callback ref: renders the widget as soon as its slot mounts (warm-up), removes it when the slot goes away. */
  const attach = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      containerRef.current = el;
      ensureWidget().catch(() => {});
      return () => {
        containerRef.current = null;
        const widget = widgetRef.current;
        widgetRef.current = null;
        settle({ error: 'Form closed' });
        widget?.then(({ api, id }) => api.remove(id)).catch(() => {});
      };
    },
    [ensureWidget, settle],
  );

  const getToken = React.useCallback(async (): Promise<string | null> => {
    if (!enabled) return null;
    const { api, id } = await ensureWidget();
    settle({ error: 'Superseded by a new submission' });
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => settle({ error: 'Turnstile check timed out' }), TOKEN_TIMEOUT_MS);
      pendingRef.current = { resolve, reject, timer };
      // Tokens are single use: reset clears the previous one, execute asks Cloudflare for a new one.
      api.reset(id);
      api.execute(id);
    });
  }, [enabled, ensureWidget, settle]);

  const widget = enabled ? <div ref={attach} className="[&>*]:mt-4" /> : null;
  return { widget, getToken };
}

/** Request headers carrying the token (none when Turnstile is off). */
export function turnstileHeaders(token: string | null): Record<string, string> {
  return token ? { [TURNSTILE_HEADER]: token } : {};
}
