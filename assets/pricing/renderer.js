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
