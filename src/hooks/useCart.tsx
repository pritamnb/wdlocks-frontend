'use client';

import * as React from 'react';
import type { WooCart, WooProduct } from '@/types';
import {
  buildCart,
  describeLine,
  emptyBasket,
  lineKey,
  readBasket,
  toLineInputs,
  writeBasket,
  BASKET_STORAGE_KEY,
  MAX_BASKET_LINES,
  type BasketLine,
  type BasketLineInput,
  type BasketLineSnapshot,
  type BasketState,
} from '@/lib/basket';
import { MAX_CART_QUANTITY } from '@/lib/constants';
import { pickShippingOption, type ShippingOption } from '@/lib/shipping-options';
import { useToast } from '@/components/ui/Toast';

export type CartStatus = 'loading' | 'ready' | 'error';

export interface AddToCartInput {
  /** Simple product ID, or variation ID for variable products. */
  id: number;
  quantity?: number;
  /** WooCommerce attribute pair for variations (kept on the line for the order). */
  variation?: Array<{ attribute: string; value: string }>;
  /** Used for the success toast. */
  name?: string;
  /** If false, the drawer won't auto-open after adding. */
  openDrawer?: boolean;
  /**
   * How the line should look (name, inc-VAT unit price, image, human variation label), taken from the product data
   * on screen. Falls back to the catalogue + the layout's product list when omitted.
   */
  preview?: BasketLineSnapshot;
}

export interface CartContextValue {
  cart: WooCart | null;
  status: CartStatus;
  error: string | null;
  /** Total units in the basket (Navbar badge). */
  itemCount: number;
  /** Items subtotal including VAT, in pence — matches the inc-VAT prices shown on cards. */
  subtotalPence: number;
  /**
   * Cart keys currently being mutated. The basket is local, so this is always empty; it stays in the contract so
   * the line components keep their `pending` prop.
   */
  pendingKeys: ReadonlySet<string>;
  isAdding: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Re-reads the basket from storage. */
  refresh: () => Promise<void>;
  addToCart: (input: AddToCartInput) => Promise<boolean>;
  updateCartItem: (key: string, quantity: number) => Promise<boolean>;
  removeCartItem: (key: string) => Promise<boolean>;
  /** Empties the basket (after an order, or when handing it to the WooCommerce checkout). Never throws. */
  clearCart: () => Promise<boolean>;
  /** Id (WooCommerce rate id) of the chosen delivery option: the cheapest by default; '' when the store offered none. */
  shippingOptionId: string;
  /** The store's delivery options, cheapest first (read from WooCommerce by the layout). */
  shippingOptions: readonly ShippingOption[];
  /** The layout's product list (every product WooCommerce sells). */
  products: readonly WooProduct[];
  setShippingOption: (id: string) => void;
  /** Ids and quantities for POST /api/checkout/intent. */
  lineInputs: BasketLineInput[];
  /** Server-confirmed unit prices (pence by id) after a 409 total_mismatch: the basket shows them from now on. */
  applyPrices: (prices: Record<string, number>) => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}

const NO_PENDING: ReadonlySet<string> = new Set();

function clampQuantity(q: number): number {
  return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.round(q)));
}

/**
 * The basket lives in the browser (localStorage, see src/lib/basket.ts): every add, quantity change and removal is a
 * synchronous state update, so the drawer, badge and totals respond at once and nothing waits on wdlocks.co.uk.
 * `products` (the layout's ISR catalogue) keeps displayed prices current and fills in lines added without a preview.
 */
export function CartProvider({ children, products = [], shippingOptions = [] }: { children: React.ReactNode; products?: WooProduct[]; shippingOptions?: readonly ShippingOption[] }) {
  const { toast } = useToast();
  const [basket, setBasket] = React.useState<BasketState | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  // Latest basket for callbacks without stale closures.
  const basketRef = React.useRef<BasketState | null>(null);
  React.useEffect(() => {
    basketRef.current = basket;
  }, [basket]);

  // Load once on mount (after hydration, so the server and first client render agree), then follow other tabs.
  React.useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const initial = readBasket();
      basketRef.current = initial;
      setBasket(initial);
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== BASKET_STORAGE_KEY) return;
      const next = readBasket();
      basketRef.current = next;
      setBasket(next);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  /** Applies a change to the basket, persists it and returns the new state. */
  const commit = React.useCallback((update: (prev: BasketState) => BasketState): BasketState => {
    const prev = basketRef.current ?? readBasket();
    const next = { ...update(prev), updatedAt: Date.now() };
    basketRef.current = next;
    writeBasket(next);
    setBasket(next);
    return next;
  }, []);

  const openCart = React.useCallback(() => setIsOpen(true), []);
  const closeCart = React.useCallback(() => setIsOpen(false), []);

  const refresh = React.useCallback(async () => {
    const next = readBasket();
    basketRef.current = next;
    setBasket(next);
  }, []);

  const addToCart = React.useCallback(
    async ({ id, quantity = 1, variation, name, openDrawer = true, preview }: AddToCartInput) => {
      const qty = clampQuantity(quantity);
      const prev = basketRef.current ?? readBasket();
      const existing = prev.lines.find((l) => l.id === id);
      if (!existing && prev.lines.length >= MAX_BASKET_LINES) {
        toast({ type: 'error', message: `Your basket can hold ${MAX_BASKET_LINES} different items. Please remove one first.` });
        return false;
      }
      const snapshot: BasketLineSnapshot = preview ?? describeLine(id, products);
      commit((state) => {
        const found = state.lines.find((l) => l.id === id);
        if (found) {
          return {
            ...state,
            lines: state.lines.map((l) =>
              l.id === id
                ? { ...l, quantity: clampQuantity(l.quantity + qty), name: snapshot.name || l.name, pricePence: snapshot.pricePence || l.pricePence, image: snapshot.image ?? l.image, variation: snapshot.variation ?? l.variation }
                : l,
            ),
          };
        }
        const line: BasketLine = { id, quantity: qty, ...snapshot, ...(variation ? { attributes: variation } : {}), addedAt: Date.now() };
        return { ...state, lines: [...state.lines, line] };
      });
      toast({
        type: 'success',
        message: name ? `${name} added to basket ✓` : 'Added to basket ✓',
        action: openDrawer ? undefined : { label: 'View basket', onClick: openCart },
      });
      if (openDrawer) setIsOpen(true);
      return true;
    },
    [commit, openCart, products, toast],
  );

  const removeCartItem = React.useCallback(
    async (key: string) => {
      const prev = basketRef.current ?? readBasket();
      const line = prev.lines.find((l) => lineKey(l.id) === key);
      if (!line) return false;
      commit((state) => ({ ...state, lines: state.lines.filter((l) => lineKey(l.id) !== key) }));
      const undo = () => {
        commit((state) => (state.lines.some((l) => l.id === line.id) ? state : { ...state, lines: [...state.lines, line] }));
      };
      toast({ type: 'info', message: `${line.name} removed`, duration: 6000, action: { label: 'Undo', onClick: undo } });
      return true;
    },
    [commit, toast],
  );

  const updateCartItem = React.useCallback(
    async (key: string, quantity: number) => {
      const prev = basketRef.current ?? readBasket();
      if (!prev.lines.some((l) => lineKey(l.id) === key)) return false;
      if (quantity <= 0) return removeCartItem(key);
      const qty = clampQuantity(quantity);
      commit((state) => ({ ...state, lines: state.lines.map((l) => (lineKey(l.id) === key ? { ...l, quantity: qty } : l)) }));
      return true;
    },
    [commit, removeCartItem],
  );

  const clearCart = React.useCallback(async () => {
    commit((state) => ({ ...emptyBasket(), shippingOptionId: state.shippingOptionId }));
    return true;
  }, [commit]);

  const setShippingOption = React.useCallback(
    (id: string) => {
      const option = pickShippingOption(shippingOptions, id);
      if (option) commit((state) => ({ ...state, shippingOptionId: option.id }));
    },
    [commit, shippingOptions],
  );

  const applyPrices = React.useCallback(
    (prices: Record<string, number>) => {
      const now = Date.now();
      commit((state) => ({
        ...state,
        lines: state.lines.map((l) => {
          const p = prices[String(l.id)];
          return typeof p === 'number' && Number.isFinite(p) && p > 0 ? { ...l, pricePence: Math.round(p), verifiedAt: now } : l;
        }),
      }));
    },
    [commit],
  );

  const cart = React.useMemo(() => (basket ? buildCart(basket, products, shippingOptions) : null), [basket, products, shippingOptions]);
  const status: CartStatus = basket ? 'ready' : 'loading';
  const itemCount = cart?.items_count ?? 0;
  const subtotalPence = cart ? Number(cart.totals.total_items) + Number(cart.totals.total_items_tax) : 0;
  const shippingOptionId = pickShippingOption(shippingOptions, basket?.shippingOptionId)?.id ?? '';
  const lineInputs = React.useMemo(() => (basket ? toLineInputs(basket) : []), [basket]);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      status,
      error: null,
      itemCount,
      subtotalPence,
      pendingKeys: NO_PENDING,
      isAdding: false,
      isOpen,
      openCart,
      closeCart,
      refresh,
      addToCart,
      updateCartItem,
      removeCartItem,
      clearCart,
      shippingOptionId,
      shippingOptions,
      products,
      setShippingOption,
      lineInputs,
      applyPrices,
    }),
    [cart, status, itemCount, subtotalPence, isOpen, openCart, closeCart, refresh, addToCart, updateCartItem, removeCartItem, clearCart, shippingOptionId, shippingOptions, products, setShippingOption, lineInputs, applyPrices],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
