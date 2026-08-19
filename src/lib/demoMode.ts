// Single source of truth for "are we in demo mode?".
//
// The demo ships in the SAME bundle and the SAME Netlify deploy as the real
// dashboard, so this cannot be a build-time flag — one build has to serve both.
// The decision is made from the URL path once, at module load, before anything
// else imports it.
//
// Everything under /sample is the public portfolio demo:
//   - no auth (the login wall is bypassed, nothing is gated)
//   - no database (lib/supabase.ts swaps in the in-memory fixture mock)
//   - no network calls to the private voice backend
//
// Everything else is the real, authenticated dashboard, unchanged.
//
// This is evaluated eagerly rather than per-render because lib/supabase.ts
// picks its client at module scope. A React-context version would be cleaner
// in principle, but the client must be decided before the first import lands.

export const DEMO_BASENAME = '/sample';

/**
 * True when the current page is under /sample.
 *
 * Read from window.location at load. Guarded for non-browser contexts (tests,
 * any future SSR) where `window` is undefined — those default to the real app,
 * never to the demo.
 */
const detectDemo = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === DEMO_BASENAME || path.startsWith(`${DEMO_BASENAME}/`);
};

export const IS_DEMO = detectDemo();

/**
 * Router basename for the current mode. The demo mounts under /sample so every
 * in-app link and redirect stays inside the demo; the real app mounts at root.
 */
export const ROUTER_BASENAME = IS_DEMO ? DEMO_BASENAME : undefined;

/** Convenience for call sites that read better as a function. */
export const isDemo = (): boolean => IS_DEMO;
