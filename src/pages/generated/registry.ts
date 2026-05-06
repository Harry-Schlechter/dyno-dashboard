// Registry of agent-generated pages.
//
// Agents append to this file when they create a new page. Each entry:
//   - slug:    URL segment after /spaces/  (e.g. 'positano-2026-07' → /spaces/positano-2026-07)
//   - title:   Display title in the sidebar
//   - emoji:   Single emoji prefix in the sidebar
//   - kind:    Page family — one of 'trip' | 'project' | 'report' | 'plan' | 'persona' | 'other'
//   - author:  Persona id that created the page (for attribution)
//   - createdAt: ISO date
//   - component: lazy-loaded React component (default export)
//
// Keep this file alphabetically sorted by slug — makes diffs reviewable.
//
// IMPORTANT: pages must default-export a React functional component and import
// only from '../../components/generated' (the building-block barrel).
//
// See dashboard.md at the repo root for the full guardrails.

import React from 'react';

export type GeneratedPageKind = 'trip' | 'project' | 'report' | 'plan' | 'persona' | 'other';

export interface GeneratedPageEntry {
  slug: string;
  title: string;
  emoji: string;
  kind: GeneratedPageKind;
  author: string;
  createdAt: string;
  component: React.LazyExoticComponent<React.ComponentType>;
  /** Optional one-line summary for the sidebar tooltip / index page. */
  summary?: string;
  /** If true, the page is hidden from the sidebar but still routable. */
  hidden?: boolean;
}

export const GENERATED_PAGES: GeneratedPageEntry[] = [
  {
    slug: 'seattle-june-2026',
    title: 'Seattle — June 2026',
    emoji: '🏔️',
    kind: 'trip',
    author: 'travel-agent',
    createdAt: '2026-05-03',
    summary: 'Harry + Sydney · Jun 12–18 · Rainier + Olympic National Parks.',
    component: React.lazy(() => import('./seattle-june-2026')),
  },
];
