// test/update-pricing.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPricing, bake, main, PRICING_URL } from '../scripts/update-pricing.mjs';

const usd = (m) => ({ minor_units: m, currency: 'USD', currency_symbol: '$', display_scale: 2 });
const snapshot = {
  catalog_schema_version: 4,
  tiers: [{
    tier: 'free', display_name: 'Free',
    presentation: { summary: 'S', bullets: ['**5** accounts'], is_featured: false, ribbon_label: null },
    purchase_options: [],
  }],
};

const okFetch = () => async (url) => ({ ok: true, status: 200, json: async () => snapshot, _url: url });

test('PRICING_URL targets pricing, not product-options', () => {
  assert.equal(PRICING_URL, 'https://bitgarth.com/api/v1/pricing');
  assert.doesNotMatch(PRICING_URL, /product-options/);
});

test('fetchPricing sends a bare GET with no headers/credentials', async () => {
  let received;
  const fetchImpl = async (url, opts) => { received = { url, opts }; return { ok: true, status: 200, json: async () => snapshot }; };
  await fetchPricing(PRICING_URL, fetchImpl);
  assert.equal(received.url, PRICING_URL);
  // No second argument at all, or an argument with no headers/credentials.
  assert.ok(received.opts === undefined || (!received.opts.headers && !received.opts.credentials));
});

test('fetchPricing throws on non-2xx', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(() => fetchPricing(PRICING_URL, fetchImpl), /429/);
});

test('bake injects cards and offers into html', () => {
  const html = `<div class="grid"><!-- PRICING:CARDS:START -->X<!-- PRICING:CARDS:END --></div>
<!-- PRICING:JSONLD:START --><script type="application/ld+json">
{ "@graph": [ { "@type": "SoftwareApplication", "offers": [] } ] }
</script><!-- PRICING:JSONLD:END -->`;
  const out = bake({ snapshot, html }).html;
  assert.match(out, /id="tier-free"/);
  assert.match(out, /"name": "Free"/);
  assert.doesNotMatch(out, />X</);
});

test('bake injects note when pricing_summary is present', () => {
  const html = `<p class="note" id="pricing-note"><!-- PRICING:NOTE:START -->OLD<!-- PRICING:NOTE:END --></p>
<div class="grid"><!-- PRICING:CARDS:START -->X<!-- PRICING:CARDS:END --></div>
<!-- PRICING:JSONLD:START --><script type="application/ld+json">
{ "@graph": [ { "@type": "SoftwareApplication", "offers": [] } ] }
</script><!-- PRICING:JSONLD:END -->`;
  const out = bake({ snapshot: { ...snapshot, pricing_summary: '**Free** does less.' }, html }).html;
  assert.match(out, /<span class="chip free">Free<\/span> does less\./);
  assert.doesNotMatch(out, /OLD/);
});

test('main writes snapshot then index on success', async () => {
  const writes = {};
  const code = await main({
    fetchImpl: okFetch(),
    readFile: async () => `<div class="grid"><!-- PRICING:CARDS:START -->X<!-- PRICING:CARDS:END --></div>
<!-- PRICING:JSONLD:START --><script type="application/ld+json">
{ "@graph": [ { "@type": "SoftwareApplication", "offers": [] } ] }
</script><!-- PRICING:JSONLD:END -->`,
    writeFile: async (p, c) => { writes[p] = c; },
    log: () => {},
  });
  assert.equal(code, 0);
  assert.ok(Object.keys(writes).some((p) => p.endsWith('snapshot.json')));
  assert.ok(Object.keys(writes).some((p) => p.endsWith('index.html')));
});

test('main returns 1 and writes nothing on fetch failure', async () => {
  const writes = {};
  const code = await main({
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    readFile: async () => 'unused',
    writeFile: async (p, c) => { writes[p] = c; },
    log: () => {},
    errorLog: () => {},
  });
  assert.equal(code, 1);
  assert.deepEqual(writes, {}); // previous snapshot preserved
});
