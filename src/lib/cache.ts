import { useCallback, useState } from 'react';

/**
 * Instant-load cache: every module reads its last known data from localStorage
 * synchronously on mount, so screens render immediately (even fully offline)
 * and refresh quietly in the background.
 */

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const reviver = (key: string, value: unknown) => {
  if (typeof value === 'string' && ISO.test(value) && /(At|Date|date)$/.test(key)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return value;
};

export function hasCache(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw, reviver) as T;
  } catch {
    return fallback;
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable - ignore */
  }
}

/**
 * State that hydrates from cache instantly and persists on every update.
 * Returns [value, setValue, hadCache].
 */
export function useCachedState<T>(key: string, fallback: T): [T, (value: T) => void, boolean] {
  const [cached] = useState(() => hasCache(key));
  const [value, setValue] = useState<T>(() => readCache<T>(key, fallback));

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeCache(key, next);
    },
    [key]
  );

  return [value, set, cached];
}

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
