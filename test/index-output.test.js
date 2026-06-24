// test/index-output.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderPricing } from '../assets/pricing/renderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const html = await readFile(resolve(root, 'index.html'), 'utf8');
const snapshot = JSON.parse(await readFile(resolve(root, 'assets/pricing/snapshot.json'), 'utf8'));

test('banned copy is absent from index.html', () => {
  assert.doesNotMatch(html, /free,\s*forever/i);
  assert.doesNotMatch(html, /every export feature/i);
  assert.doesNotMatch(html, /unlimited/i);
});

test('baked cards match the renderer output for the committed snapshot', () => {
  const { cardsHTML } = renderPricing(snapshot);
  const region = html.match(/<!-- PRICING:CARDS:START -->\n([\s\S]*?)\n\s*<!-- PRICING:CARDS:END -->/)[1];
  assert.equal(region.trim(), cardsHTML.trim());
});

test('JSON-LD offers match snapshot-derived offers', () => {
  const { offers } = renderPricing(snapshot);
  const jsonText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const app = JSON.parse(jsonText)['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
  assert.deepEqual(app.offers, offers);
});

test('Free tier renders no purchase CTA price (shows $0)', () => {
  const region = html.match(/id="tier-free"[\s\S]*?<\/article>/)[0];
  assert.match(region, /\$0/);
  assert.doesNotMatch(region, /\/ year/);
});
