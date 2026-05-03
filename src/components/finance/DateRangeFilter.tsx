import React, { useMemo } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, TextField, Stack } from '@mui/material';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

export type DateRangePreset = 'this_month' | 'last_month' | 'last_3_months' | 'ytd' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export const computeRange = (preset: DateRangePreset, customStart?: string, customEnd?: string, today = new Date()): DateRange => {
  switch (preset) {
    case 'this_month':
      return { preset, start: fmt(startOfMonth(today)), end: fmt(today) };
    case 'last_month': {
      const last = subMonths(today, 1);
      return { preset, start: fmt(startOfMonth(last)), end: fmt(endOfMonth(last)) };
    }
    case 'last_3_months':
      return { preset, start: fmt(startOfMonth(subMonths(today, 2))), end: fmt(today) };
    case 'ytd':
      return { preset, start: fmt(startOfYear(today)), end: fmt(today) };
    case 'custom':
      return { preset, start: customStart || fmt(startOfMonth(today)), end: customEnd || fmt(today) };
  }
};

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const DateRangeFilter: React.FC<Props> = ({ value, onChange }) => {
  const presets: { key: DateRangePreset; label: string }[] = useMemo(() => [
    { key: 'this_month', label: 'This month' },
    { key: 'last_month', label: 'Last month' },
    { key: 'last_3_months', label: 'Last 3 mo' },
    { key: 'ytd', label: 'YTD' },
    { key: 'custom', label: 'Custom' },
  ], []);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={value.preset}
        onChange={(_, v) => {
          if (!v) return;
          onChange(computeRange(v, value.start, value.end));
        }}
      >
        {presets.map(p => (
          <ToggleButton key={p.key} value={p.key} sx={{ textTransform: 'none', px: 1.5 }}>
            {p.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {value.preset === 'custom' && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            inputProps={{ max: value.end }}
          />
          <TextField
            size="small"
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            inputProps={{ min: value.start }}
          />
        </Box>
      )}
    </Stack>
  );
};

export default DateRangeFilter;
