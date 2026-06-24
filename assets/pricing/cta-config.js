// CTA targets are landing-specific and intentionally NOT sourced from the
// pricing catalog. Keyed by tier.tier.
export const ctaByTier = {
  free:    { href: '#install',                  label: 'Install &amp; start',  ghost: true,  external: false },
  basic:   { href: 'https://demo.bitgarth.app/', label: 'Try it in the demo',  ghost: false, external: true },
  premium: { href: 'https://demo.bitgarth.app/', label: 'Try it in the demo',  ghost: true,  external: true },
};
