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
  /** Cart keys with a change the server has not confirmed yet (checkout waits for these; the controls stay live). */
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
/** How long after the last +/− tap the new quantity is sent (one request per burst of taps). */
const QUANTITY_DEBOUNCE_MS = 350;

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
      if (on === prev.has(key)) return prev;
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  // Quantity changes (Pritam, 12 Nov: "+/− and checkout feel slow"). Every tap changes the line at once and the
  // controls never lock. The Store API (2–3 s a call) gets one request per burst of taps, carrying the final
  // quantity, and update/remove requests run one at a time so WooCommerce never saves the same session twice at
  // once. A server reply only fills in what the shopper has not changed since it was sent.
  const desiredQty = React.useRef(new Map<string, number>());
  const removingKeys = React.useRef(new Set<string>());
  const flushTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = React.useRef(false);
  const mutationChain = React.useRef<Promise<void>>(Promise.resolve());

  /**
   * Stores a cart from the server, keeping the shopper's unsent quantities, lines being removed and provisional
   * lines from adds still in flight (except `settledTemp`, the provisional line this reply replaces).
   */
  const commitCart = React.useCallback((next: WooCart, settledTemp?: string) => {
    const temps = (cartRef.current?.items ?? []).filter((i) => isOptimisticKey(i.key) && i.key !== settledTemp);
    let merged = next;
    if (desiredQty.current.size > 0 || removingKeys.current.size > 0 || temps.length > 0) {
      const items = next.items
        .filter((i) => !removingKeys.current.has(i.key))
        .map((i) => {
          const q = desiredQty.current.get(i.key);
          return q === undefined || q === i.quantity ? i : scaleLine(i, q);
        });
      merged = withOptimisticItems(next, [...items, ...temps]);
    }
    cartRef.current = merged;
    setCart(merged);
    setStatus('ready');
    setError(null);
  }, []);

  /** Sends queued quantities one request at a time until none are left (taps during a request queue the next). */
  const flushQuantities = React.useCallback(() => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    if (flushing.current) return; // the running loop picks up whatever was queued
    flushing.current = true;
    mutationChain.current = mutationChain.current.then(async () => {
      try {
        for (;;) {
          const entry = [...desiredQty.current].find(([k]) => !isOptimisticKey(k));
          if (!entry) break;
          const [key, quantity] = entry;
          try {
            const next = await updateItem({ key, quantity });
            if (desiredQty.current.get(key) === quantity) desiredQty.current.delete(key);
            commitCart(next);
            if (!desiredQty.current.has(key) && !removingKeys.current.has(key)) markPending(key, false);
          } catch (err) {
            // Drop every unsent change and show the server's basket again.
            for (const k of [...desiredQty.current.keys()]) {
              if (isOptimisticKey(k)) continue;
              desiredQty.current.delete(k);
              if (!removingKeys.current.has(k)) markPending(k, false);
            }
            toast({ type: 'error', message: friendlyCartError(err) });
            void load();
          }
        }
      } finally {
        flushing.current = false;
      }
    });
  }, [commitCart, markPending, toast, load]);

  const scheduleFlush = React.useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushQuantities, QUANTITY_DEBOUNCE_MS);
  }, [flushQuantities]);

  const addToCart = React.useCallback(
    async ({ id, quantity = 1, variation, name, openDrawer = true, preview }: AddToCartInput) => {
      setIsAdding(true);
      warmed.current = true;
      mutationSeq.bump();
      // Optimistic: show the line and open the drawer immediately; the server cart replaces it when it arrives.
      const snapshot = cartRef.current;
      const knownKeys = new Set((snapshot?.items ?? []).map((i) => i.key));
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
        // +/− pressed on the provisional line while the add was in flight: carry the change over to the real line.
        const tempWanted = tempKey ? desiredQty.current.get(tempKey) : undefined;
        if (tempKey) desiredQty.current.delete(tempKey);
        if (tempWanted !== undefined && tempWanted !== quantity) {
          const real = next.items.find((i) => i.id === id && !knownKeys.has(i.key)) ?? next.items.find((i) => i.id === id);
          if (real) {
            desiredQty.current.set(real.key, Math.max(1, real.quantity + tempWanted - quantity));
            markPending(real.key, true);
            scheduleFlush();
          }
        }
        commitCart(next, tempKey ?? undefined);
        toast({
          type: 'success',
          message: name ? `${name} added to basket ✓` : 'Added to basket ✓',
          action: openDrawer ? undefined : { label: 'View basket', onClick: openCart },
        });
        if (openDrawer) setIsOpen(true);
        return true;
      } catch (err) {
        if (tempKey) {
          desiredQty.current.delete(tempKey);
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
    [toast, openCart, markPending, mutationSeq, commitCart, scheduleFlush],
  );

  const removeCartItem = React.useCallback(
    async (key: string) => {
      const snapshot = cartRef.current;
      if (!snapshot || isOptimisticKey(key)) return false;
      const item = snapshot.items.find((i) => i.key === key);
      if (!item) return false;
      mutationSeq.bump();
      desiredQty.current.delete(key);
      removingKeys.current.add(key);
      // Optimistic removal
      const without = withOptimisticItems(snapshot, snapshot.items.filter((i) => i.key !== key));
      cartRef.current = without;
      setCart(without);
      markPending(key, true);
      let ok = false;
      const run = mutationChain.current.then(async () => {
        try {
          const next = await removeItem({ key });
          removingKeys.current.delete(key);
          commitCart(next);
          ok = true;
          const undo = async () => {
            try {
              commitCart(await addItem({ id: item.id, quantity: item.quantity }));
            } catch (err) {
              toast({ type: 'error', message: friendlyCartError(err) });
            }
          };
          toast({ type: 'info', message: `${item.name} removed`, duration: 6000, action: { label: 'Undo', onClick: () => void undo() } });
        } catch (err) {
          removingKeys.current.delete(key);
          // Put the line back, then resync with the server's truth.
          const current = cartRef.current;
          if (current && !current.items.some((i) => i.key === key)) {
            const restored = withOptimisticItems(current, [...current.items, item]);
            cartRef.current = restored;
            setCart(restored);
          }
          toast({ type: 'error', message: friendlyCartError(err) });
          void load();
        } finally {
          markPending(key, false);
        }
      });
      mutationChain.current = run;
      await run;
      return ok;
    },
    [toast, markPending, load, mutationSeq, commitCart],
  );

  const clearCart = React.useCallback(async () => {
    try {
      const next = await clearCartRequest();
      desiredQty.current.clear();
      removingKeys.current.clear();
      cartRef.current = next;
      setCart(next);
      return true;
    } catch (err) {
      console.error('[cart] clear failed', err);
      return false;
    }
  }, []);

  /** Changes a line's quantity at once; the request follows when the taps stop (see flushQuantities). */
  const updateCartItem = React.useCallback(
    async (key: string, quantity: number) => {
      const current = cartRef.current;
      if (!current || !current.items.some((i) => i.key === key)) return false;
      if (quantity <= 0) return removeCartItem(key);

      mutationSeq.bump();
      desiredQty.current.set(key, quantity);
      const next = withOptimisticItems(current, current.items.map((i) => (i.key === key ? scaleLine(i, quantity) : i)));
      cartRef.current = next;
      setCart(next);
      markPending(key, true);
      // A provisional line has no server key yet; addToCart sends its quantity once the add lands.
      if (!isOptimisticKey(key)) scheduleFlush();
      return true;
    },
    [markPending, removeCartItem, mutationSeq, scheduleFlush],
  );

  // Never leave a timer running after unmount.
  React.useEffect(() => () => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
  }, []);

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
