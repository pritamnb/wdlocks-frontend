'use client';

import * as React from 'react';
import type { WooCart, WooCartItem } from '@/types';
import { fetchCart, addItem, updateItem, removeItem, friendlyCartError } from '@/lib/cart-client';
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
  addToCart: (input: AddToCartInput) => Promise<boolean>;
  updateCartItem: (key: string, quantity: number) => Promise<boolean>;
  removeCartItem: (key: string) => Promise<boolean>;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
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

const REFOCUS_REFRESH_MS = 5 * 60_000;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [cart, setCart] = React.useState<WooCart | null>(null);
  const [status, setStatus] = React.useState<CartStatus>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [pendingKeys, setPendingKeys] = React.useState<ReadonlySet<string>>(new Set());

  // Latest cart for optimistic snapshots without stale closures.
  const cartRef = React.useRef<WooCart | null>(null);
  React.useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const openCart = React.useCallback(() => setIsOpen(true), []);
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

  // Fetch once on mount, and again when the tab becomes visible after a long absence.
  React.useEffect(() => {
    let active = true;
    fetchCart()
      .then((next) => {
        if (!active) return;
        setCart(next);
        setError(null);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(friendlyCartError(err));
        setStatus('error');
      });

    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > REFOCUS_REFRESH_MS) {
        last = Date.now();
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const markPending = React.useCallback((key: string, on: boolean) => {
    setPendingKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const addToCart = React.useCallback(
    async ({ id, quantity = 1, variation, name, openDrawer = true }: AddToCartInput) => {
      setIsAdding(true);
      try {
        const next = await addItem({ id, quantity, variation });
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
        toast({ type: 'error', message: friendlyCartError(err) });
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [toast, openCart],
  );

  const removeCartItem = React.useCallback(
    async (key: string) => {
      const snapshot = cartRef.current;
      if (!snapshot) return false;
      const item = snapshot.items.find((i) => i.key === key);
      // Optimistic removal
      setCart(withOptimisticItems(snapshot, snapshot.items.filter((i) => i.key !== key)));
      markPending(key, true);
      try {
        const next = await removeItem({ key });
        setCart(next);
        if (item) toast({ type: 'info', message: `${item.name} removed` });
        return true;
      } catch (err) {
        setCart(snapshot); // rollback
        toast({ type: 'error', message: friendlyCartError(err) });
        return false;
      } finally {
        markPending(key, false);
      }
    },
    [toast, markPending],
  );

  const updateCartItem = React.useCallback(
    async (key: string, quantity: number) => {
      const snapshot = cartRef.current;
      if (!snapshot) return false;
      const item = snapshot.items.find((i) => i.key === key);
      if (!item) return false;
      if (quantity <= 0) return removeCartItem(key);

      // Optimistic update
      setCart(withOptimisticItems(snapshot, snapshot.items.map((i) => (i.key === key ? scaleLine(i, quantity) : i))));
      markPending(key, true);
      try {
        const next = await updateItem({ key, quantity });
        setCart(next);
        return true;
      } catch (err) {
        setCart(snapshot); // rollback
        toast({ type: 'error', message: friendlyCartError(err) });
        return false;
      } finally {
        markPending(key, false);
      }
    },
    [toast, markPending, removeCartItem],
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
      addToCart,
      updateCartItem,
      removeCartItem,
    }),
    [cart, status, error, itemCount, subtotalPence, pendingKeys, isAdding, isOpen, openCart, closeCart, refresh, addToCart, updateCartItem, removeCartItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
