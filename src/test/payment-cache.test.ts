import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidatePaymentCaches, readCache, writeCache } from '@/lib/cache';

describe('deleted upfront payment cache', () => {
  beforeEach(() => localStorage.clear());

  it('removes the $50 received and $150 balance of a deleted $200 order from cached dashboard views', () => {
    writeCache('mc_dashboard_metrics', { upfrontReceived: 50, orderBalances: 150 });
    writeCache('mc_dashboard_upfronts', [{ receipt_number: 'UP-test', total: 200, amount_paid: 50, balance_due: 150 }]);
    writeCache('mc_dashboard_recent', [{ invoiceNumber: 'UP-test', total: 200 }]);
    invalidatePaymentCaches();
    expect(readCache('mc_dashboard_metrics', { upfrontReceived: 0, orderBalances: 0 })).toEqual({ upfrontReceived: 0, orderBalances: 0 });
    expect(readCache('mc_dashboard_upfronts', [])).toEqual([]);
    expect(readCache('mc_dashboard_recent', [])).toEqual([]);
  });

  it('invalidates related documents and reports and notifies mounted views without clearing stock or branch', () => {
    const changed = vi.fn();
    window.addEventListener('mc-payments-changed', changed);
    ['mc_sales_cache', 'mc_sale_items_cache', 'mc_quotations_cache'].forEach(key => writeCache(key, [{ id: 'deleted' }]));
    writeCache('mc_products_cache', [{ id: 'retained' }]);
    localStorage.setItem('mc_branch', 'woodlands');
    invalidatePaymentCaches();
    ['mc_sales_cache', 'mc_sale_items_cache', 'mc_quotations_cache'].forEach(key => expect(localStorage.getItem(key)).toBeNull());
    expect(readCache('mc_products_cache', [])).toEqual([{ id: 'retained' }]);
    expect(localStorage.getItem('mc_branch')).toBe('woodlands');
    expect(changed).toHaveBeenCalledOnce();
    window.removeEventListener('mc-payments-changed', changed);
  });
});