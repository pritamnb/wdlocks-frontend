'use client';

import useSWR from 'swr';
import { getCatalogueProducts, getProduct } from '@/lib/wdlocks-api';
import type { WooProduct } from '@/types';

const swrOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 60_000,
  errorRetryCount: 2,
};

/**
 * Client-side product list (all 9 catalogue products). Pass server-fetched data as
 * `fallbackData` to render instantly and revalidate in the background.
 */
export function useProducts(fallbackData?: WooProduct[]) {
  const { data, error, isLoading, mutate } = useSWR<WooProduct[]>(
    'products:catalogue',
    () => getCatalogueProducts(),
    { ...swrOptions, fallbackData },
  );
  return { products: data ?? [], error: error as Error | undefined, isLoading: isLoading && !data, refresh: mutate };
}

/** Single product by ID. */
export function useProduct(id: number | null, fallbackData?: WooProduct) {
  const { data, error, isLoading, mutate } = useSWR<WooProduct>(
    id ? `product:${id}` : null,
    () => getProduct(id as number),
    { ...swrOptions, fallbackData },
  );
  return { product: data ?? null, error: error as Error | undefined, isLoading: isLoading && !data, refresh: mutate };
}
