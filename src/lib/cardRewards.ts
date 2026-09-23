// Static reward-program metadata for Harry's 5 cards — annual fees, per-point
// cash values, and category earn rates. Sourced from live account captures
// 2026-09-22 (see extension/offer-scripts/benefits/*.md) and TPG's September
// 2026 monthly points valuations for cents-per-point estimates. None of this
// is queryable from Supabase — there's no schema for it — so it's hardcoded
// here and should be refreshed by hand alongside the benefits/ captures.
import { SpendCategory } from './finance';

export type CardId = 'chase_sapphire_preferred' | 'chase_freedom_unlimited' | 'amex_gold' | 'citi_custom_cash' | 'capone_venture_x';

export interface CardMeta {
  id: CardId;
  label: string;
  accountId: string;       // financial_accounts.id
  institution: string;
  annualFee: number;
  pointCurrency: string;   // display name for the currency this card earns
  centsPerPoint: number;   // TPG Sept 2026 valuation, used to convert points -> $ estimate
  // Multiplier per SpendCategory. Categories not listed earn the card's base rate.
  categoryRates: Partial<Record<SpendCategory, number>>;
  baseRate: number;        // rate for anything not called out above
  notes?: string;          // caveats worth surfacing next to the numbers
}

export const CARD_META: Record<CardId, CardMeta> = {
  chase_sapphire_preferred: {
    id: 'chase_sapphire_preferred',
    label: 'Chase Sapphire Preferred',
    accountId: '8ba0792c-5149-4187-92c3-6d9bbb0b9e85',
    institution: 'Chase',
    annualFee: 95,
    pointCurrency: 'Ultimate Rewards',
    centsPerPoint: 2.05,
    categoryRates: {
      dining: 3,
      travel: 2,
      groceries: 3, // "online grocery purchases" only — in-store groceries earn base rate, see note
      car: 3,       // gas & EV charging
    },
    baseRate: 1,
    notes: 'Groceries 3x is ONLINE grocery purchases only (Instacart etc.) — in-store grocery runs earn the 1x base rate, not 3x. 5x on Chase Travel bookings and Lyft not modeled here (booking-channel-specific, not a spend category).',
  },
  chase_freedom_unlimited: {
    id: 'chase_freedom_unlimited',
    label: 'Chase Freedom Unlimited',
    accountId: 'd81b5399-be5c-40dd-b08b-7e53ba607cb9',
    institution: 'Chase',
    annualFee: 0,
    pointCurrency: 'Ultimate Rewards',
    centsPerPoint: 2.05, // only transferable because it's paired with the Sapphire Preferred on this account
    categoryRates: {
      dining: 3,
    },
    baseRate: 1.5,
    notes: 'Points only transfer to travel partners because this card is paired with the Sapphire Preferred — standalone Freedom Unlimited points are cash-back only (1 cent each).',
  },
  amex_gold: {
    id: 'amex_gold',
    label: 'Amex Gold',
    accountId: '839fb499-bfa5-4895-849d-976dec15fcd4',
    institution: 'American Express',
    annualFee: 325,
    pointCurrency: 'Membership Rewards',
    centsPerPoint: 2.0,
    categoryRates: {
      dining: 4,     // worldwide restaurants, up to $50k/yr then 1x
      groceries: 4,  // US supermarkets, up to $25k/yr then 1x
      travel: 3,     // flights booked direct or via Amex Travel
    },
    baseRate: 1,
    notes: '4x dining/groceries caps at $50k/yr (dining) and $25k/yr (groceries) — Harry is nowhere near either cap. $325 fee is partly offset by $100 Resy credit (enrolled, $92.53 earned YTD) + $84 Dunkin credit (enrolled, $0 used) + $120 Dining Credit (enrolled) — see benefit-value math below.',
  },
  citi_custom_cash: {
    id: 'citi_custom_cash',
    label: 'Citi Custom Cash',
    accountId: '754a0073-a4db-4aa2-a988-591c054b4af0',
    institution: 'Citibank',
    annualFee: 0,
    pointCurrency: 'ThankYou Points',
    centsPerPoint: 1.9,
    categoryRates: {
      // 5% back in whatever the top eligible category is each cycle, capped
      // at $500 spend/cycle (=$25 max per cycle at 5%). Currently landing on
      // gas; not modeled as a fixed SpendCategory since it auto-rotates.
    },
    baseRate: 1,
    notes: '5% back (5x) in your top eligible spend category each cycle, capped at $500 spend/cycle then drops to 1%. Currently landing on gas for Harry. Not modeled per-category here since the bonus category auto-rotates based on spend, not fixed.',
  },
  capone_venture_x: {
    id: 'capone_venture_x',
    label: 'Capital One Venture X',
    accountId: '2bd95a8b-b2b3-4c67-a37e-ea528c23d344',
    institution: 'Capital One',
    annualFee: 395,
    pointCurrency: 'Capital One Miles',
    centsPerPoint: 1.85,
    categoryRates: {
      travel: 5, // via Capital One Travel portal; 2x on everything else including travel booked elsewhere
    },
    baseRate: 2,
    notes: '5x travel is Capital One Travel portal bookings only — flights/hotels booked elsewhere earn the 2x base rate. $395 fee largely offset by $300 annual travel credit + 10,000 anniversary bonus miles (~$185 at 1.85c) + lounge access — see benefit-value math below.',
  },
};

export const CARD_LIST: CardMeta[] = Object.values(CARD_META);

export const cardByAccountId = (accountId: string): CardMeta | undefined =>
  CARD_LIST.find(c => c.accountId === accountId);

// Estimated annual dollar value of a card's non-spend-driven benefits — i.e.
// perks and credits that exist regardless of how much you charge to the card.
// This is separate from category-rate math (which depends on Harry's actual
// spend) so the two can be shown side by side: "value from just holding the
// card" vs "value from earning extra points on what you already spend."
export interface BenefitValueLine {
  label: string;
  annualValue: number;
  status: 'enrolled' | 'unenrolled' | 'automatic';
}

export const CARD_BENEFIT_VALUE: Record<CardId, BenefitValueLine[]> = {
  chase_sapphire_preferred: [
    { label: '$100 annual Chase Travel hotel credit', annualValue: 100, status: 'automatic' },
    { label: 'Global Entry/TSA PreCheck credit ($120 every 4yrs)', annualValue: 30, status: 'automatic' },
    { label: 'Apple TV subscription ($156/yr value)', annualValue: 0, status: 'unenrolled' }, // NOT counted — not activated
    { label: '10% anniversary points bonus', annualValue: 0, status: 'automatic' }, // depends on points earned, not a flat credit
  ],
  chase_freedom_unlimited: [],
  amex_gold: [
    { label: '$100 Resy Credit', annualValue: 100, status: 'enrolled' },
    { label: '$84 Dunkin Credit', annualValue: 0, status: 'enrolled' }, // enrolled but $0 used YTD — counted as unrealized, see UI note
    { label: '$120 Dining Credit', annualValue: 0, status: 'enrolled' }, // enrolled but usage not confirmed — conservative $0
  ],
  citi_custom_cash: [],
  capone_venture_x: [
    { label: '$300 annual Capital One Travel credit', annualValue: 300, status: 'automatic' },
    { label: '10,000 anniversary bonus miles (~1.85c/mi)', annualValue: 185, status: 'automatic' },
    { label: 'Global Entry/TSA PreCheck credit ($120 every 4yrs)', annualValue: 30, status: 'automatic' },
  ],
};
