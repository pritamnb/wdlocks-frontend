'use client';

import * as React from 'react';
import type { WooCart, WooCartItem } from '@/types';
import { fetchCart, addItem, updateItem, removeItem, clearCart as clearCartRequest, friendlyCartError } from '@/lib/cart-client';
import { emptyCart, isOptimisticKey, optimisticLine, type CartLinePreview } from '@/lib/cart-optimistic';
import { sumPence } from '@/lib/wdlocks-api';
import { useToast } from '@/components/ui/Toast';

export type CartStatus = 'loading' | 'ready' | 'error';

export interface AddToCartInput {
  /** Simple product ID, or variation ID for variable products. */
  id: number;
  quantity?: number;
  variation?: Array<{ attribute: string; value: string }>;
  /** Used for the success toast. */
  name?: string;
  /** If false, the drawer won't auto-open after adding. */
  openDrawer?: boolean;
  /**
   * What the line will look like, so the drawer can open instantly with a provisional line while the Store API
   * round trip (1–3 s on shared hosting) completes. Without it the drawer waits for the server.
   */
  preview?: Omit<CartLinePreview, 'id' | 'quantity'>;
}

export interface CartContextValue {
  cart: WooCart | null;
  status: CartStatus;
  error: string | null;
  /** Total units in the basket (Navbar badge). */
  itemCount: number;
  /** Items subtotal including VAT, in pence — matches the inc-VAT prices shown on cards. */
  subtotalPence: number;
  /** Cart keys currently being mutated (disable their controls). */
  pendingKeys: ReadonlySet<string>;
  isAdding: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Re-fetches the basket, showing the loading state. */
  refresh: () => Promise<void>;
  /**
   * Establishes the Store API session in the background (sets the cart cookie) so the first add needs one
   * upstream call instead of two. Safe to call often; only the first call does anything.
   */
  warmSession: () => void;
  addToCart: (input: AddToCartInput) => Promise<boolean>;
  updateCartItem: (key: string, quantity: number) => Promise<boolean>;
  removeCartItem: (key: string) => Promise<boolean>;
  /** Empties the basket (after handing it to the WooCommerce checkout). Never throws. */
  clearCart: () => Promise<boolean>;
  /** Replaces the basket with a cart returned by another proxy call (address, delivery rate, coupon). */
  replaceCart: (cart: WooCart) => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}

/** Set by the proxy next to the httpOnly token so the client can tell whether a basket session exists at all. */
export const CART_MARKER_COOKIE = 'wd_cart';

function hasCartSession(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${CART_MARKER_COOKIE}=`));
}

/** Recomputes the cheap derived fields after an optimistic item change so the UI stays coherent. */
function withOptimisticItems(cart: WooCart, items: WooCartItem[]): WooCart {
  const total_items = items.reduce((n, i) => n + Number.parseInt(i.totals.line_subtotal, 10), 0);
  const total_items_tax = items.reduce((n, i) => n + Number.parseInt(i.totals.line_subtotal_tax, 10), 0);
  return {
    ...cart,
    items,
    items_count: items.reduce((n, i) => n + i.quantity, 0),
    totals: { ...cart.totals, total_items: String(total_items), total_items_tax: String(total_items_tax) },
  };
}

function scaleLine(item: WooCartItem, quantity: number): WooCartItem {
  const unitSub = Number.parseInt(item.totals.line_subtotal, 10) / Math.max(item.quantity, 1);
  const unitTax = Number.parseInt(item.totals.line_subtotal_tax, 10) / Math.max(item.quantity, 1);
  const sub = String(Math.round(unitSub * quantity));
  const tax = String(Math.round(unitTax * quantity));
  return {
    ...item,
    quantity,
    totals: { ...item.totals, line_subtotal: sub, line_subtotal_tax: tax, line_total: sub, line_total_tax: tax },
  };
}

/** Monotonic counter kept in a closure (not a ref) so hook callbacks may bump it without mutating hook arguments. */
function createSequence() {
  let n = 0;
  return { get: () => n, bump: () => { n += 1; } };
}

const REFOCUS_REFRESH_MS = 5 * 60_000;
/** Warm the session shortly after load when the page is idle, so the first click is fast even without a hover. */
const IDLE_WARM_MS = 4_000;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [cart, setCart] = React.useState<WooCart | null>(null);
  const [status, setStatus] = React.useState<CartStatus>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [pendingKeys, setPendingKeys] = React.useState<ReadonlySet<string>>(new Set());
  // Every mutation bumps this; a GET that started before a mutation must not overwrite the mutation's result
  // (a shopper who clicks "Add" while the session is still being fetched would otherwise see an empty basket).
  const [mutationSeq] = React.useState(createSequence);

  // Latest cart for optimistic snapshots without stale closures.
  const cartRef = React.useRef<WooCart | null>(null);
  React.useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const openCart = React.useCallback(() => setIsOpen(true), []);
  const replaceCart = React.useCallback((next: WooCart) => {
    mutationSeq.bump();
    cartRef.current = next;
    setCart(next);
    setStatus('ready');
    setError(null);
  }, [mutationSeq]);
  const closeCart = React.useCallback(() => setIsOpen(false), []);

  /** Fetches the basket; all state updates happen after the await (never synchronously in an effect). */
  const load = React.useCallback(async () => {
    try {
      const next = await fetchCart();
      setCart(next);
      setError(null);
      setStatus('ready');
    } catch (err) {
      setError(friendlyCartError(err));
      setStatus('error');
    }
  }, []);

  const refresh = React.useCallback(async () => {
    setStatus('loading');
    await load();
  }, [load]);

  const applyFetched = React.useCallback((seqAtStart: number, next: WooCart) => {
    if (seqAtStart !== mutationSeq.get()) return;
    if (cartRef.current && cartRef.current.items.some((i) => isOptimisticKey(i.key))) return;
    cartRef.current = next;
    setCart(next);
    setError(null);
    setStatus('ready');
  }, [mutationSeq]);

  // One session bootstrap at most. The GET is the same call as a refresh, so it also fills the cart. Mutations wait
  // for an in-flight warm-up so the add reuses that session instead of racing it for the cookie.
  const warmed = React.useRef(false);
  const warmPromise = React.useRef<Promise<void> | null>(null);
  const warmSession = React.useCallback(() => {
    if (warmed.current || hasCartSession()) return;
    warmed.current = true;
    const seq = mutationSeq.get();
    warmPromise.current = fetchCart()
      .then((next) => applyFetched(seq, next))
      .catch(() => {
        warmed.current = false; // allow a later retry
      })
      .finally(() => {
        warmPromise.current = null;
      });
  }, [applyFetched, mutationSeq]);

  // On mount: shoppers with a basket session get it fetched; everyone else starts with an empty basket and no
  // network call on the critical path (the session is warmed when idle or on the first hover over a buy button).
  React.useEffect(() => {
    let active = true;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    if (hasCartSession()) {
      warmed.current = true;
      const seq = mutationSeq.get();
      warmPromise.current = fetchCart()
        .then((next) => {
          if (!active) return;
          applyFetched(seq, next);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(friendlyCartError(err));
          setStatus('error');
        })
        .finally(() => {
          warmPromise.current = null;
        });
    } else {
      // No session cookie → the basket is empty; settle without a network call (deferred past the effect body).
      queueMicrotask(() => {
        if (!active) return;
        setCart((c) => c ?? emptyCart());
        setStatus('ready');
      });
      idleTimer = setTimeout(warmSession, IDLE_WARM_MS);
    }

    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > REFOCUS_REFRESH_MS && hasCartSession()) {
        last = Date.now();
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      if (idleTimer) clearTimeout(idleTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, warmSession, applyFetched, mutationSeq]);

  const markPending = React.useCallback((key: string, on: boolean) => {
    setPendingKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const addToCart = React.useCallback(
    async ({ id, quantity = 1, variation, name, openDrawer = true, preview }: AddToCartInput) => {
      setIsAdding(true);
      warmed.current = true;
      mutationSeq.bump();
      // Optimistic: show the line and open the drawer immediately; the server cart replaces it when it arrives.
      const snapshot = cartRef.current;
      let tempKey: string | null = null;
      if (preview) {
        const base = snapshot ?? emptyCart();
        const line = optimisticLine({ ...preview, id, quantity });
        tempKey = line.key;
        const next = withOptimisticItems(base, [...base.items, line]);
        cartRef.current = next;
        setCart(next);
        setStatus('ready');
        setError(null);
        markPending(tempKey, true);
        if (openDrawer) setIsOpen(true);
      }
      try {
        // Let an in-flight session fetch finish first so the add joins that session (one cookie, one basket).
        if (warmPromise.current) await warmPromise.current.catch(() => undefined);
        const next = await addItem({ id, quantity, variation });
        cartRef.current = next;
        setCart(next);
        setStatus('ready');
        setError(null);
        toast({
          type: 'success',
          message: name ? `${name} added to basket ✓` : 'Added to basket ✓',
          action: openDrawer ? undefined : { label: 'View basket', onClick: openCart },
        });
        if (openDrawer) setIsOpen(true);
        return true;
      } catch (err) {
        if (tempKey) {
          // Roll the provisional line back (keep anything else that landed meanwhile).
          const current = cartRef.current;
          if (current) {
            const rolled = withOptimisticItems(current, current.items.filter((i) => i.key !== tempKey));
            cartRef.current = rolled;
            setCart(rolled);
          }
        }
        toast({ type: 'error', message: friendlyCartError(err) });
        return false;
      } finally {
        if (tempKey) markPending(tempKey, false);
        setIsAdding(false);
      }
    },
    [toast, openCart, markPending, mutationSeq],
  );

  const removeCartItem = React.useCallback(
    async (key: string) => {
      const snapshot = cartRef.current;
      if (!snapshot) return false;
      const item = snapshot.items.find((i) => i.key === key);
      mutationSeq.bump();
      // Optimistic removal
      setCart(withOptimisticItems(snapshot, snapshot.items.filter((i) => i.key !== key)));
      markPending(key, true);
      try {
        const next = await removeItem({ key });
        setCart(next);
        if (item) {
          const undo = async () => {
            try {
              const restored = await addItem({ id: item.id, quantity: item.quantity });
              setCart(restored);
            } catch (err) {
              toast({ type: 'error', message: friendlyCartError(err) });
            }
          };
          toast({ type: 'info', message: `${item.name} removed`, duration: 6000, action: { label: 'Undo', onClick: () => void undo() } });
        }
        return true;
      } catch (err) {
        setCart(snapshot); // rollback, then resync with the server's truth
        toast({ type: 'error', message: friendlyCartError(err) });
        void load();
        return false;
      } finally {
        markPending(key, false);
      }
    },
    [toast, markPending, load, mutationSeq],
  );

  const clearCart = React.useCallback(async () => {
    try {
      const next = await clearCartRequest();
      setCart(next);
      return true;
    } catch (err) {
      console.error('[cart] clear failed', err);
      return false;
    }
  }, []);

  const updateCartItem = React.useCallback(
    async (key: string, quantity: number) => {
      const snapshot = cartRef.current;
      if (!snapshot) return false;
      const item = snapshot.items.find((i) => i.key === key);
      if (!item) return false;
      if (quantity <= 0) return removeCartItem(key);

      mutationSeq.bump();
      // Optimistic update
      setCart(withOptimisticItems(snapshot, snapshot.items.map((i) => (i.key === key ? scaleLine(i, quantity) : i))));
      markPending(key, true);
      try {
        const next = await updateItem({ key, quantity });
        setCart(next);
        return true;
      } catch (err) {
        setCart(snapshot); // rollback, then resync with the server's truth
        toast({ type: 'error', message: friendlyCartError(err) });
        void load();
        return false;
      } finally {
        markPending(key, false);
      }
    },
    [toast, markPending, removeCartItem, load, mutationSeq],
  );

  const itemCount = cart?.items_count ?? 0;
  const subtotalPence = cart ? sumPence(cart.totals.total_items, cart.totals.total_items_tax) : 0;

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      status,
      error,
      itemCount,
      subtotalPence,
      pendingKeys,
      isAdding,
      isOpen,
      openCart,
      closeCart,
      refresh,
      warmSession,
      addToCart,
      updateCartItem,
      removeCartItem,
      clearCart,
      replaceCart,
    }),
    [cart, status, error, itemCount, subtotalPence, pendingKeys, isAdding, isOpen, openCart, closeCart, refresh, warmSession, addToCart, updateCartItem, removeCartItem, clearCart, replaceCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
