// DEMO PAGE — entirely fictional. Rendered only under /sample.
//
// A second agent-generated page in a different shape from the trip page, to
// show that Spaces is a general "agents publish pages here" surface rather than
// a trip-planning feature. Numbers line up with the demo fixture.

import React from 'react';
import { Box, Grid } from '@mui/material';
import {
  PageHero, SectionHeader, StatTile, InfoCard, TimelineList, QuoteBlock,
} from '../../../components/generated';

const SampleWeeklyReport: React.FC = () => (
  <Box>
    <PageHero
      title="Week in review"
      subtitle="Training held, recovery dipped and came back, dining drifted"
      meta="Written by the assistant persona · sample data"
      tags={['sample data', 'weekly', 'auto-generated']}
      accent="#FFCA28"
    />

    <QuoteBlock
      text="Generated every Sunday evening without being asked. It reads across health, training, money and the journal at once — the point being that no single page in the dashboard sees all four."
      attribution="Why this page exists"
    />

    <SectionHeader title="The numbers" />
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatTile label="Avg sleep" value="7h 06m" hint="1 night under 6h" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatTile label="Sessions" value="5" hint="3 lifts, 2 runs" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatTile label="Avg protein" value="141g" hint="target 150g" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatTile label="Spend vs plan" value="+6%" hint="dining is the gap" />
      </Grid>
    </Grid>

    <SectionHeader title="What happened" />
    <TimelineList
      entries={[
        {
          when: 'Mon – Fri',
          title: 'Recovery suppressed for five days',
          description: 'HRV sat well under baseline while resting HR ran about 6bpm high and skin temperature rose. All three moved together, which reads as accumulated fatigue rather than one bad night.',
          status: 'done',
          tag: 'health',
        },
        {
          when: 'All week',
          title: 'Training completed anyway',
          description: 'Every planned session happened, at full working weight. Worth noting given the recovery numbers — this is the kind of week that usually precedes a dip.',
          status: 'done',
          tag: 'training',
        },
        {
          when: 'Sat – Sun',
          title: 'Recovery returned to baseline',
          description: 'Three consecutive green days to close the week.',
          status: 'done',
          tag: 'health',
        },
        {
          when: 'Ongoing',
          title: 'Dining spend crossed its trailing average',
          description: 'Eight weekday charges, none at weekends. The pattern is lunches, not nights out.',
          status: 'current',
          tag: 'money',
        },
      ]}
    />

    <SectionHeader title="Worth watching" />
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <InfoCard title="The Sunday pattern" accent="#9C7BFF">
          Five of nine work-stress journal entries in the last two months landed on a Sunday, and
          Sunday mood averages 5.4 against 7.1 on other days. This is the third weekly report to
          raise it, which is itself the finding.
        </InfoCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <InfoCard title="Protein on unlogged-lunch days" accent="#FF9800">
          The protein shortfall is not spread evenly — it lands almost entirely on days with no
          lunch recorded. Likely a logging gap as much as an intake gap.
        </InfoCard>
      </Grid>
    </Grid>
  </Box>
);

export default SampleWeeklyReport;
