import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshPricing } from '../assets/pricing/runtime.js';

const usd = (m) => ({ minor_units: m, currency: 'USD', currency_symbol: '$', display_scale: 2 });
const snapshot = {
  catalog_schema_version: 4,
  tiers: [{
    tier: 'free', display_name: 'Free',
    presentation: { summary: 'S', bullets: ['**5** accounts'], is_featured: false, ribbon_label: null },
    purchase_options: [],
  }],
};

test('refreshPricing patches grid when live data differs', async () => {
  const grid = { innerHTML: 'STALE' };
  const ok = await refreshPricing({
    fetchFn: async () => ({ ok: true, json: async () => snapshot }),
    getGrid: () => grid,
  });
  assert.equal(ok, true);
  assert.match(grid.innerHTML, /id="tier-free"/);
});

test('refreshPricing leaves grid untouched on fetch failure', async () => {
  const grid = { innerHTML: 'BAKED' };
  const ok = await refreshPricing({
    fetchFn: async () => ({ ok: false, status: 429, json: async () => ({}) }),
    getGrid: () => grid,
  });
  assert.equal(ok, false);
  assert.equal(grid.innerHTML, 'BAKED');
});

test('refreshPricing swallows fetch throw without changing grid', async () => {
  const grid = { innerHTML: 'BAKED' };
  const ok = await refreshPricing({
    fetchFn: async () => { throw new Error('network'); },
    getGrid: () => grid,
  });
  assert.equal(ok, false);
  assert.equal(grid.innerHTML, 'BAKED');
});
