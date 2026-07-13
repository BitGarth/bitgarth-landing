// scripts/update-pricing.mjs
import { readFile as fsRead, writeFile as fsWrite } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderPricing } from '../assets/pricing/renderer.js';
import { replaceRegion, replaceJsonLdOffers } from './lib/inject.mjs';

export const PRICING_URL = 'https://bitgarth.com/api/v1/pricing';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, '../assets/pricing/snapshot.json');
const INDEX_PATH = resolve(__dirname, '../index.html');

export async function fetchPricing(url, fetchImpl = fetch) {
  // Bare GET: no headers, no credentials, no BitGarth app headers.
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Pricing fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  if (typeof data.catalog_schema_version !== 'number') {
    throw new Error('Pricing response missing numeric catalog_schema_version');
  }
  return data;
}

export function bake({ snapshot, html }) {
  const { cardsHTML, summaryHTML, offers } = renderPricing(snapshot);
  let out = replaceRegion(html, 'PRICING:CARDS', cardsHTML);
  if (summaryHTML) out = replaceRegion(out, 'PRICING:NOTE', summaryHTML);
  out = replaceJsonLdOffers(out, offers);
  return { html: out };
}

export async function main({
  fetchImpl = fetch,
  readFile = (p) => fsRead(p, 'utf8'),
  writeFile = (p, c) => fsWrite(p, c),
  log = console.log,
  errorLog = console.error,
} = {}) {
  let snapshot;
  try {
    snapshot = await fetchPricing(PRICING_URL, fetchImpl);
  } catch (err) {
    (errorLog || console.error)(`update-pricing: ${err.message}. Keeping previous snapshot.`);
    return 1;
  }
  log(`update-pricing: fetched catalog_schema_version=${snapshot.catalog_schema_version}`);
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  const html = await readFile(INDEX_PATH);
  const baked = bake({ snapshot, html }).html;
  await writeFile(INDEX_PATH, baked);
  log('update-pricing: index.html pricing region + JSON-LD updated.');
  return 0;
}

// Run when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code));
}
