import React from 'react';
import { Grid } from '@mui/material';

interface Props {
  /** Left column content (typically wider). */
  primary: React.ReactNode;
  /** Right column content (typically a sidebar). */
  secondary: React.ReactNode;
  /** Width split — primary md size out of 12. Default 8. */
  split?: 7 | 8 | 9;
  /** Spacing between columns. */
  gap?: number;
}

const TwoColumn: React.FC<Props> = ({ primary, secondary, split = 8, gap = 2.5 }) => (
  <Grid container spacing={gap}>
    <Grid size={{ xs: 12, md: split }}>{primary}</Grid>
    <Grid size={{ xs: 12, md: 12 - split }}>{secondary}</Grid>
  </Grid>
);

export default TwoColumn;
