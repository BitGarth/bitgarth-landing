import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, priceAmount, renderBullets, pickTerms } from '../assets/pricing/renderer.js';

const usd = (minor) => ({ minor_units: minor, currency: 'USD', currency_symbol: '$', display_scale: 2 });

test('formatPrice drops trailing .00 and keeps real decimals', () => {
  assert.equal(formatPrice(usd(5000)), '$50');
  assert.equal(formatPrice(usd(500)), '$5');
  assert.equal(formatPrice(usd(417)), '$4.17');
});

test('priceAmount returns bare number string', () => {
  assert.equal(priceAmount(usd(5000)), '50');
  assert.equal(priceAmount(usd(417)), '4.17');
});

test('renderBullets converts **bold** and escapes other html', () => {
  const html = renderBullets(['**5** accounts', 'a <b> & c']);
  assert.match(html, /<li><span><strong>5<\/strong> accounts<\/span><\/li>/);
  assert.match(html, /a &lt;b&gt; &amp; c/);
});

test('pickTerms splits monthly and yearly', () => {
  const opts = [
    { term: { quantity: 1, unit: 'month' }, price: usd(500) },
    { term: { quantity: 12, unit: 'month' }, price: usd(5000) },
  ];
  const { monthly, yearly } = pickTerms(opts);
  assert.equal(monthly.price.minor_units, 500);
  assert.equal(yearly.price.minor_units, 5000);
  assert.equal(pickTerms([]).monthly, null);
});
