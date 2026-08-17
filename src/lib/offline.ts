import { useEffect, useState } from 'react';

const LOGO_KEY = 'mc_logo_data_url';
const PRODUCTS_KEY = 'mc_products_cache';
const QUEUE_KEY = 'mc_pending_sales';

/* ---------------- Logo caching so receipts print offline ---------------- */

export function useCachedLogo(url: string) {
  const [src, setSrc] = useState<string>(() => localStorage.getItem(LOGO_KEY) || url);

  useEffect(() => {
    if (localStorage.getItem(LOGO_KEY)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result);
          try {
            localStorage.setItem(LOGO_KEY, dataUrl);
          } catch {
            /* storage full - ignore */
          }
          if (!cancelled) setSrc(dataUrl);
        };
        reader.readAsDataURL(blob);
      } catch {
        /* offline and no cache yet - keep remote url */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return src;
}

/* ---------------- Product cache ---------------- */

export function cacheProducts<T>(products: T[]) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    /* ignore */
  }
}

export function readCachedProducts<T>(): T[] {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]') as T[];
  } catch {
    return [];
  }
}

/* ---------------- Offline sale queue ---------------- */

export type PendingSale = {
  sale: Record<string, unknown>;
  items: Record<string, unknown>[];
  queuedAt: string;
};

export function readQueue(): PendingSale[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as PendingSale[];
  } catch {
    return [];
  }
}

export function writeQueue(queue: PendingSale[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function queueSale(entry: Omit<PendingSale, 'queuedAt'>) {
  writeQueue([...readQueue(), { ...entry, queuedAt: new Date().toISOString() }]);
}
