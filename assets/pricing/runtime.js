import { renderPricing } from './renderer.js';

export const PRICING_URL = 'https://bitgarth.com/api/v1/pricing';

export async function refreshPricing({ fetchFn, getGrid }) {
  try {
    const res = await fetchFn(PRICING_URL); // bare GET, no headers/credentials
    if (!res.ok) return false;
    const snapshot = await res.json();
    const grid = getGrid();
    if (!grid) return false;
    const { cardsHTML } = renderPricing(snapshot);
    if (grid.innerHTML.trim() !== cardsHTML.trim()) {
      grid.innerHTML = cardsHTML;
    }
    return true;
  } catch {
    return false; // silent: baked markup is the floor
  }
}

if (typeof document !== 'undefined') {
  const boot = () => refreshPricing({
    fetchFn: (url) => fetch(url),
    getGrid: () => document.getElementById('pricing-grid'),
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
