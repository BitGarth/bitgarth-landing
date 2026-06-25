// CTA targets are landing-specific and intentionally NOT sourced from the
// pricing catalog. Keyed by tier.tier.
export const ctaByTier = {
  free:    { href: '#install', label: 'Install &amp; start', ghost: true,  external: false },
  basic:   { href: '#install', label: 'Get started',         ghost: false, external: false },
  premium: { href: '#install', label: 'Get started',         ghost: true,  external: false },
};
