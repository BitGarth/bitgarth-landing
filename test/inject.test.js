// test/inject.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceRegion, replaceJsonLdOffers } from '../scripts/lib/inject.mjs';

const cardsHtml = `<div class="grid">
  <!-- PRICING:CARDS:START -->
  OLD
  <!-- PRICING:CARDS:END -->
</div>`;

test('replaceRegion swaps content between markers, keeps markers', () => {
  const out = replaceRegion(cardsHtml, 'PRICING:CARDS', 'NEW');
  assert.match(out, /<!-- PRICING:CARDS:START -->\nNEW\n  <!-- PRICING:CARDS:END -->/);
  assert.doesNotMatch(out, /OLD/);
});

test('replaceRegion throws on missing marker', () => {
  assert.throws(() => replaceRegion('<div></div>', 'PRICING:CARDS', 'x'), /marker/i);
});

const jsonLdHtml = `<!-- PRICING:JSONLD:START -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization" },
      { "@type": "SoftwareApplication", "offers": [ { "old": true } ] }
    ]
  }
  </script>
  <!-- PRICING:JSONLD:END -->`;

test('replaceJsonLdOffers replaces only SoftwareApplication offers', () => {
  const out = replaceJsonLdOffers(jsonLdHtml, [{ '@type': 'Offer', name: 'Free' }]);
  const json = JSON.parse(out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const app = json['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
  assert.deepEqual(app.offers, [{ '@type': 'Offer', name: 'Free' }]);
  assert.ok(json['@graph'].some((n) => n['@type'] === 'Organization'));
});

test('replaceJsonLdOffers escapes < to prevent script breakout', () => {
  const out = replaceJsonLdOffers(jsonLdHtml, [{ '@type': 'Offer', name: 'X</script><script>bad' }]);
  assert.doesNotMatch(out, /<\/script><script>bad/); // no literal breakout
  assert.match(out, /\\u003c\/script/);              // escaped form present
  // round-trips: parsing the script JSON recovers the original value
  const json = JSON.parse(out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const app = json['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
  assert.equal(app.offers[0].name, 'X</script><script>bad');
});
