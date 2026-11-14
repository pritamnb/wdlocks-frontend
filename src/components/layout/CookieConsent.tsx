'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { CloseButton } from '@/components/ui/Modal';
import { useCart } from '@/hooks/useCart';
import { useConsent } from '@/hooks/useConsent';
import { ACCEPT_ALL, ESSENTIAL_ONLY, type ConsentChoice } from '@/lib/consent';
import { cn } from '@/lib/cn';

/**
 * Cookie consent popup (UK GDPR / PECR): shown once at the bottom of the viewport on a first visit, reopened from the
 * footer's "Cookie settings" link. Not modal: the page stays usable and nothing traps focus. Hidden while the basket
 * drawer is open so the two never overlap. Sits above the sticky header (z-40) and below the drawer (z-50) and toasts
 * (z-60). The choice itself is handled by useConsent (localStorage `wd:consent`, re-asked after 12 months).
 */

type Category =
  | { key: 'essential'; locked: true; name: string; detail: string }
  | { key: keyof ConsentChoice; locked: false; name: string; detail: string };

const CATEGORIES: Category[] = [
  {
    key: 'essential',
    locked: true,
    name: 'Essential',
    detail: 'Keep your basket (saved in this browser), the checkout form and your order working, and let Stripe protect the payment page from fraud. Always on.',
  },
  {
    key: 'analytics',
    locked: false,
    name: 'Analytics',
    detail: 'Would tell us which pages help and which do not. We run no analytics today; your choice is saved for when we do.',
  },
  {
    key: 'marketing',
    locked: false,
    name: 'Marketing',
    detail: 'Would let advertising partners measure their ads. None are used on this site today.',
  },
];

function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150',
        checked ? 'border-red bg-red' : 'border-charcoal/25 bg-cream-mid',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150', checked && 'translate-x-5')}
      />
    </button>
  );
}

export function CookieConsent() {
  const { isOpen, openedFromSettings, consent, save, close } = useConsent();
  const { isOpen: cartOpen } = useCart();
  const reduceMotion = useReducedMotion();
  const show = isOpen && !cartOpen;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="cookie-consent"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6"
        >
          {/* Keyed on how it was opened, so a reopen starts fresh on the settings view with the stored choice. */}
          <Panel
            key={openedFromSettings ? 'settings' : 'first-visit'}
            openedFromSettings={openedFromSettings}
            initial={{ analytics: consent?.analytics ?? false, marketing: consent?.marketing ?? false }}
            save={save}
            close={close}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Panel({ openedFromSettings, initial, save, close }: { openedFromSettings: boolean; initial: ConsentChoice; save: (c: ConsentChoice) => void; close: () => void }) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(openedFromSettings);
  const [draft, setDraft] = React.useState<ConsentChoice>(initial);

  // Reopened from the footer: move focus to the popup so keyboard and screen-reader users land on it. A first visit
  // never steals focus from the page.
  React.useEffect(() => {
    if (!openedFromSettings) return;
    const raf = requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [openedFromSettings]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && openedFromSettings) close();
  };

  return (
    // 10rem of headroom keeps the card below the sticky header (100–136px tall) even with the settings open on a short phone.
    <div
      ref={dialogRef}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="pointer-events-auto mx-auto max-h-[calc(100dvh-10rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-black/10 bg-white p-5 text-charcoal shadow-card-hover outline-none sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="cookie-consent-title" className="font-playfair text-lg font-semibold tracking-tight sm:text-xl">
            Cookies on this site
          </h2>
          <p id="cookie-consent-desc" className="mt-1.5 text-sm leading-relaxed text-charcoal/80">
            Essential cookies and browser storage keep your basket and checkout working. Analytics and marketing
            cookies stay off until you say yes.{' '}
            <Link href="/privacy" prefetch={false} className="font-medium text-charcoal underline underline-offset-2 hover:text-red">
              Privacy policy
            </Link>
          </p>
        </div>
        {openedFromSettings && <CloseButton onClick={close} label="Close cookie settings" className="-mr-2 -mt-2 shrink-0" />}
      </div>

      {expanded && (
        <ul id="cookie-consent-settings" className="mt-4 divide-y divide-black/10 rounded-xl border border-black/10">
          {CATEGORIES.map((c) => {
            return (
              <li key={c.key} className="flex items-start justify-between gap-4 p-3.5 sm:p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-charcoal/70">{c.detail}</p>
                </div>
                {c.locked ? (
                  <span className="shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60">Always on</span>
                ) : (
                  <Switch
                    id={`cookie-switch-${c.key}`}
                    checked={draft[c.key]}
                    label={`${c.name} cookies`}
                    onChange={(next) => setDraft((d) => ({ ...d, [c.key]: next }))}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        {expanded ? (
          <Button onClick={() => save(draft)} className="sm:order-1">
            Save settings
          </Button>
        ) : (
          <Button onClick={() => save(ACCEPT_ALL)} className="sm:order-1">
            Accept all
          </Button>
        )}
        <Button variant="secondary" onClick={() => save(ESSENTIAL_ONLY)} className="sm:order-2">
          Essential only
        </Button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="cookie-consent-settings"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-charcoal underline-offset-2 hover:underline sm:order-3 sm:ml-auto"
        >
          {expanded ? 'Hide settings' : 'Cookie settings'}
        </button>
      </div>
    </div>
  );
}
