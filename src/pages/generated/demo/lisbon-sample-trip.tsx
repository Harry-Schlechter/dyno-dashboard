// DEMO PAGE — entirely fictional. Rendered only under /sample.
//
// Mirrors the structure of a real agent-generated trip page (hero, itinerary,
// budget, checklist) so the portfolio demo can show what the travel agent
// produces, without exposing a real trip, real bookings, or real people.
//
// Every name, date, price and place below is invented.

import React from 'react';
import { Box, Grid } from '@mui/material';
import {
  PageHero, SectionHeader, KeyValueGrid, ItineraryDay, InfoCard,
  BudgetCard, ChecklistCard, QuoteBlock,
} from '../../../components/generated';

const LisbonSampleTrip: React.FC = () => (
  <Box>
    <PageHero
      title="Lisbon + Sintra"
      subtitle="Five days, slow pace, a lot of pastéis"
      meta="Sample trip · May 4–9"
      tags={['sample data', 'city break', 'food', '5 days']}
      accent="#26A69A"
    />

    <QuoteBlock
      text="This page was written by the travel-agent persona after a dozen messages in Telegram. It chooses its own layout blocks from an allow-listed component library, so every trip page comes out coherent without anyone designing it."
      attribution="What Spaces is"
    />

    <SectionHeader title="At a glance" />
    <KeyValueGrid
      items={[
        { label: 'Dates', value: 'May 4 – May 9 (5 nights)' },
        { label: 'Flights', value: 'Sample Air 218 / 219' },
        { label: 'Base', value: 'Central Lisbon' },
        { label: 'Day trip', value: 'Sintra, Thursday' },
        { label: 'Budget', value: '$2,400 all-in' },
        { label: 'Pace', value: 'One fixed thing per day' },
      ]}
    />

    <SectionHeader title="Itinerary" hint="One anchor per day — the rest stays open" />

    <ItineraryDay
      day="Monday"
      date="May 4"
      items={[
        { time: '11:20', title: 'Land and transfer', description: 'Taxi into the centre, about 25 minutes.', kind: 'travel' },
        { time: '14:00', title: 'Check in, drop bags', kind: 'rest' },
        { time: '19:30', title: 'Dinner at Casa Exemplo', description: 'Booked for two.', kind: 'food' },
      ]}
    />

    <ItineraryDay
      day="Tuesday"
      date="May 5"
      items={[
        { time: '09:30', title: 'Old town on foot', description: 'Go before the crowds arrive.', kind: 'activity' },
        { time: '12:00', title: 'Lunch at Mercado Amostra', kind: 'food' },
        { time: '16:00', title: 'Viewpoint for sunset', kind: 'activity' },
      ]}
    />

    <ItineraryDay
      day="Wednesday"
      date="May 6"
      items={[
        { time: '10:00', title: 'Museu Fictício', description: 'Tickets bought ahead — timed entry.', kind: 'activity' },
        { time: '15:00', title: 'Tram to the waterfront', kind: 'travel' },
        { time: '20:00', title: 'Live music at Sample Club', description: 'Reservation held.', kind: 'food' },
      ]}
    />

    <ItineraryDay
      day="Thursday"
      date="May 7"
      items={[
        { time: '08:15', title: 'Train to Sintra', description: 'About 40 minutes.', kind: 'travel' },
        { time: '09:30', title: 'Palace grounds', description: 'Early entry — it fills up by midday.', kind: 'activity' },
        { time: '13:00', title: 'Lunch in the village', kind: 'food' },
        { time: '17:00', title: 'Train back, easy evening', kind: 'rest' },
      ]}
    />

    <ItineraryDay
      day="Friday"
      date="May 8"
      items={[
        { time: 'All day', title: 'Deliberately unplanned', description: 'The trip already has enough fixed points.', kind: 'rest' },
        { time: '20:00', title: 'Last dinner', description: 'Chosen that morning, not now.', kind: 'food' },
      ]}
    />

    <SectionHeader title="Budget" />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <BudgetCard
          title="Estimated"
          items={[
            { label: 'Flights (2)', amount: 780 },
            { label: 'Lodging (5 nights)', amount: 720 },
            { label: 'Food', amount: 500 },
            { label: 'Transit + tickets', amount: 220 },
            { label: 'Buffer', amount: 180 },
          ]}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <ChecklistCard
          title="Before leaving"
          items={[
            { label: 'Sintra tickets (timed entry)', done: true },
            { label: 'Book Thursday train', done: true },
            { label: 'Confirm music reservation', done: false },
            { label: 'Sort transit cards', done: false, hint: 'Cheaper at the station than online' },
          ]}
        />
      </Grid>
    </Grid>

    <SectionHeader title="Notes" />
    <InfoCard title="Why the pace is light" accent="#26A69A">
      Two earlier trips in the journal ran hot — packed days, then a flat week afterwards. This one
      has a single anchor per day and one fully open day. That constraint came from the pattern in
      the data, not from a preference stated up front.
    </InfoCard>
  </Box>
);

export default LisbonSampleTrip;
