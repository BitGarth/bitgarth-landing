import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, priceAmount, renderBullets, pickTerms, renderPriceBlock, renderTier, renderCards, buildOffers, renderPricing } from '../assets/pricing/renderer.js';

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

const sampleSnapshot = {
  catalog_schema_version: 4,
  tiers: [
    {
      tier: 'free', display_name: 'Free',
      presentation: { summary: 'Local ownership.', bullets: ['**5** accounts'], is_featured: false, ribbon_label: null },
      purchase_options: [],
    },
    {
      tier: 'basic', display_name: 'Basic',
      presentation: { summary: 'Ten accounts.', bullets: ['**10** accounts'], is_featured: true, ribbon_label: 'Early adopter discount' },
      purchase_options: [
        { term: { quantity: 1, unit: 'month' }, price: usd(500) },
        { term: { quantity: 12, unit: 'month' }, price: usd(5000) },
      ],
    },
  ],
};

test('renderPriceBlock: free shows $0 and no yearly amount', () => {
  const html = renderPriceBlock(sampleSnapshot.tiers[0]);
  assert.match(html, /\$0/);
  assert.doesNotMatch(html, /\/ year/);
});

test('renderPriceBlock: paid shows monthly headline + yearly secondary', () => {
  const html = renderPriceBlock(sampleSnapshot.tiers[1]);
  assert.match(html, /\$5<small>\/month<\/small>/);
  assert.match(html, /or \$50 \/ year/);
});

test('renderTier: featured tier gets class + ribbon, free does not', () => {
  const free = renderTier(sampleSnapshot.tiers[0]);
  const basic = renderTier(sampleSnapshot.tiers[1]);
  assert.match(basic, /class="tier featured"/);
  assert.match(basic, /<div class="ribbon">Early adopter discount<\/div>/);
  assert.match(basic, /Get started/);
  assert.doesNotMatch(free, /class="tier featured"/);
  assert.doesNotMatch(free, /ribbon/);
  assert.match(free, /Install &amp; start/);
});

test('renderTier: non-featured tier with a ribbon_label renders no ribbon', () => {
  const tier = {
    tier: 'free', display_name: 'Free',
    presentation: { summary: 'S', bullets: ['**5** accounts'], is_featured: false, ribbon_label: 'Stray label' },
    purchase_options: [],
  };
  const html = renderTier(tier);
  assert.doesNotMatch(html, /class="ribbon"/);
  assert.doesNotMatch(html, /class="tier featured"/);
});

test('buildOffers derives from snapshot, free price 0, paid monthly price', () => {
  const offers = buildOffers(sampleSnapshot);
  assert.deepEqual(offers[0], {
    '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD',
    description: 'Local ownership.',
  });
  assert.equal(offers[1].price, '5');
  assert.equal(offers[1].priceSpecification.billingDuration, 'P1M');
});

test('renderPricing returns cards + offers together', () => {
  const { cardsHTML, offers } = renderPricing(sampleSnapshot);
  assert.match(cardsHTML, /id="tier-free"/);
  assert.equal(offers.length, 2);
});

test('renderTier throws a clear error for a tier with no CTA config', () => {
  const tier = {
    tier: 'enterprise', display_name: 'Enterprise',
    presentation: { summary: 'S', bullets: ['x'], is_featured: false, ribbon_label: null },
    purchase_options: [],
  };
  assert.throws(() => renderTier(tier), /No CTA config for tier "enterprise"/);
});
