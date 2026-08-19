// Registry of DEMO Spaces pages, used only under /sample.
//
// The real registry (registry.ts) points at genuine agent-generated pages —
// real trips, real venues, real people, real booking details. None of that can
// ship in a public portfolio demo, so Spaces swaps to this list instead.
//
// Keeping it as a separate module (rather than filtering the real one) means
// the real pages are behind a different dynamic import and are never reached
// from the demo path.

import React from 'react';
import { GeneratedPageEntry } from './registry';

export const DEMO_GENERATED_PAGES: GeneratedPageEntry[] = [
  {
    slug: 'lisbon-sample-trip',
    title: 'Lisbon + Sintra — sample trip',
    emoji: '🇵🇹',
    kind: 'trip',
    author: 'travel-agent',
    createdAt: '2026-04-18',
    summary: 'Five days, one anchor per day. Written by the travel agent from a Telegram thread.',
    component: React.lazy(() => import('./demo/lisbon-sample-trip')),
  },
  {
    slug: 'sample-weekly-report',
    title: 'Week in review — sample',
    emoji: '📊',
    kind: 'report',
    author: 'personal-assistant',
    createdAt: '2026-04-13',
    summary: 'Auto-written every Sunday. Reads health, training, money and journal together.',
    component: React.lazy(() => import('./demo/sample-weekly-report')),
  },
];
