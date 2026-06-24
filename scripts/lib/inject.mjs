// scripts/lib/inject.mjs

export function replaceRegion(html, name, replacement) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const re = new RegExp(`(${start})[\\s\\S]*?([ \\t]*)(${end})`);
  if (!re.test(html)) throw new Error(`Missing or malformed marker pair for "${name}"`);
  return html.replace(re, (_m, s, indent, e) => `${s}\n${replacement}\n${indent}${e}`);
}

export function replaceJsonLdOffers(html, offers) {
  const start = '<!-- PRICING:JSONLD:START -->';
  const end = '<!-- PRICING:JSONLD:END -->';
  const sIdx = html.indexOf(start);
  const eIdx = html.indexOf(end);
  if (sIdx === -1 || eIdx === -1) throw new Error('Missing PRICING:JSONLD markers');
  const region = html.slice(sIdx, eIdx);
  const scriptMatch = region.match(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/);
  if (!scriptMatch) throw new Error('No JSON-LD script in PRICING:JSONLD region');
  const data = JSON.parse(scriptMatch[2]);
  const node = (data['@graph'] || []).find((n) => n['@type'] === 'SoftwareApplication');
  if (!node) throw new Error('No SoftwareApplication node in JSON-LD');
  node.offers = offers;
  const serialized = `${scriptMatch[1]}\n  ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')}\n  ${scriptMatch[3]}`;
  const newRegion = region.replace(scriptMatch[0], serialized);
  return html.slice(0, sIdx) + newRegion + html.slice(eIdx);
}
