'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Visible heading id — required for aria-labelledby. */
  labelledBy: string;
  describedBy?: string;
  /** 'center' = dialog in the middle; 'right' = side sheet (cart drawer); 'left' = nav drawer. */
  variant?: 'center' | 'right' | 'left';
  children: React.ReactNode;
  className?: string;
  /** Element to restore focus to on close (defaults to the previously focused element). */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}

const noopSubscribe = () => () => {};
/** True after hydration — portals can only render on the client. */
function useIsClient() {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal/sheet: focus trap, Escape to close, overlay click, body scroll lock,
 * focus restoration. Rendered in a portal so it escapes sticky/overflow parents.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  variant = 'center',
  children,
  className,
  returnFocusTo,
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const lastActive = React.useRef<HTMLElement | null>(null);
  const mounted = useIsClient();
  // Callers often pass inline arrows; keep the effect keyed on `open` only.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Focus management + scroll lock
  React.useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement as HTMLElement | null;
    // Capture now: the trigger ref is set before the modal opens and may be cleared by close time.
    const explicitReturnTarget = returnFocusTo?.current ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      const target = explicitReturnTarget ?? lastActive.current;
      target?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose read via ref; returnFocusTo captured at open
  }, [open]);

  if (!mounted) return null;

  const panelMotion =
    variant === 'center'
      ? { initial: { opacity: 0, y: 16, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.98 } }
      : variant === 'right'
        ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
        : { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } };

  const panelPosition =
    variant === 'center'
      ? 'relative mx-4 my-6 w-full max-w-lg max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl'
      : variant === 'right'
        ? 'fixed inset-y-0 right-0 h-dvh w-full max-w-md'
        : 'fixed inset-y-0 left-0 h-dvh w-[86vw] max-w-sm';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn('fixed inset-0 z-50 flex', variant === 'center' && 'items-center justify-center')}
          role="presentation"
        >
          <motion.div
            className="absolute inset-0 bg-near-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            tabIndex={-1}
            className={cn('bg-warm-white text-charcoal shadow-2xl outline-none', panelPosition, className)}
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
            {...panelMotion}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-charcoal transition-colors duration-150 hover:bg-cream-mid"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
