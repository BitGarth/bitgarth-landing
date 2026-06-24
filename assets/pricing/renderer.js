import { ctaByTier } from './cta-config.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escapes text, then re-enables **bold** spans as <strong>.
function inlineMarkup(s) {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function priceAmount(price) {
  const value = price.minor_units / 10 ** price.display_scale;
  return value
    .toFixed(price.display_scale)
    .replace(/\.0+$/, '')          // 50.00 -> 50
    .replace(/(\.\d*?)0+$/, '$1'); // 4.170 -> 4.17
}

export function formatPrice(price) {
  return `${price.currency_symbol}${priceAmount(price)}`;
}

export function renderBullets(bullets) {
  return bullets.map((b) => `<li><span>${inlineMarkup(b)}</span></li>`).join('\n              ');
}

export function pickTerms(purchaseOptions = []) {
  const find = (q) => purchaseOptions.find((o) => o.term && o.term.quantity === q) || null;
  return { monthly: find(1), yearly: find(12) };
}

const CORNERS = ['tl', 'tr', 'bl', 'br'].map((p) =>
  `<svg class="corner ${p}" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M0 7V0h7" stroke="currentColor" stroke-width="0.8"/><path d="M1 1l4 4" stroke="currentColor" stroke-width="0.8"/></svg>`
).join('\n            ');

export function renderPriceBlock(tier) {
  const { monthly, yearly } = pickTerms(tier.purchase_options);
  if (!monthly && !yearly) {
    return `<div class="price">$0<small>free</small></div>\n            <div class="yearly">&nbsp;</div>`;
  }
  const headline = monthly || yearly;
  const headlineLabel = headline === monthly ? '/month' : '/year';
  const price = `<div class="price">${formatPrice(headline.price)}<small>${headlineLabel}</small></div>`;
  const secondary = (monthly && yearly)
    ? `<div class="yearly">or ${formatPrice(yearly.price)} / year</div>`
    : `<div class="yearly">&nbsp;</div>`;
  return `${price}\n            ${secondary}`;
}

export function renderTier(tier) {
  const featured = tier.presentation.is_featured;
  const ribbon = (featured && tier.presentation.ribbon_label)
    ? `\n            <div class="ribbon">${escapeHtml(tier.presentation.ribbon_label)}</div>` : '';
  const cta = ctaByTier[tier.tier];
  const ctaClass = `btn${cta.ghost ? ' ghost' : ''} cta`;
  const ctaAttrs = cta.external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<article class="tier${featured ? ' featured' : ''}" aria-labelledby="tier-${tier.tier}">${ribbon}
            ${CORNERS}

            <div class="name" id="tier-${tier.tier}">${escapeHtml(tier.display_name)}</div>
            ${renderPriceBlock(tier)}
            <p class="summary">${escapeHtml(tier.presentation.summary)}</p>
            <ul>
              ${renderBullets(tier.presentation.bullets)}
            </ul>
            <a class="${ctaClass}" href="${cta.href}"${ctaAttrs}>${cta.label} <span class="arrow" aria-hidden="true">→</span></a>
          </article>`;
}

export function renderCards(snapshot) {
  return snapshot.tiers.map(renderTier).join('\n\n          ');
}

export function buildOffers(snapshot) {
  return snapshot.tiers.map((tier) => {
    const { monthly, yearly } = pickTerms(tier.purchase_options);
    const headline = monthly || yearly;
    const offer = {
      '@type': 'Offer',
      name: tier.display_name,
      price: headline ? priceAmount(headline.price) : '0',
      priceCurrency: headline ? headline.price.currency : 'USD',
      description: tier.presentation.summary,
    };
    if (monthly) {
      offer.priceSpecification = {
        '@type': 'UnitPriceSpecification',
        price: priceAmount(monthly.price),
        priceCurrency: monthly.price.currency,
        unitCode: 'MON',
        billingDuration: 'P1M',
      };
    }
    // Paid tiers: move description after priceSpecification to keep a stable key order.
    if (offer.priceSpecification) {
      const { description, ...rest } = offer;
      return { ...rest, description };
    }
    return offer;
  });
}

export function renderPricing(snapshot) {
  return { cardsHTML: renderCards(snapshot), offers: buildOffers(snapshot) };
}
