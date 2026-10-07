import { supabase } from '@/integrations/supabase/client';

export const BRANCHES = [
  { id: 'maita', name: 'Maita Cakes' },
  { id: 'woodlands', name: 'Woodlands' },
] as const;

const KEY = 'mc_branch';

export function getBranch(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function branchName(id = getBranch()) {
  return BRANCHES.find(b => b.id === id)?.name ?? 'Maita Cakes';
}

function applyHeader(id: string) {
  // Every database request carries the chosen branch; the backend isolates data by it.
  const h = (supabase as unknown as { rest: { headers: Headers | Record<string, string> } }).rest.headers;
  if (h instanceof Headers) h.set('x-branch', id);
  else h['x-branch'] = id;
}

/** Cached data from a different branch must never show — wipe local caches on switch. */
function clearCaches() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('mc_') && k !== KEY && k !== 'mc_logo_data_url' && !k.startsWith('mc_pending'))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function setBranch(id: string) {
  if (getBranch() !== id) clearCaches();
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  applyHeader(id);
}

export function clearBranch() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

const initial = getBranch();
if (initial) applyHeader(initial);
