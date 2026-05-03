import React, { useMemo } from 'react';
import { Box, Typography, Tooltip, Stack } from '@mui/material';
import { format, startOfDay, subDays, addDays } from 'date-fns';

export interface HeatmapEntry {
  date: string;        // 'yyyy-MM-dd'
  value: number;       // raw value (calories, hours, etc.)
  label?: string;      // optional tooltip override
}

interface Props {
  data: HeatmapEntry[];
  days?: number;          // total days to render (default 84 = 12 weeks)
  emptyColor?: string;
  fillColor?: string;     // base hue; darker = more
  reverse?: boolean;      // if true, lower values = more saturated (e.g. fewer logs = bad)
  title?: string;
  legend?: string;
  thresholds?: number[];  // 4 values defining the 5 color stops
  formatTooltip?: (entry: HeatmapEntry | null, date: string) => string;
}

const ActivityHeatmap: React.FC<Props> = ({
  data,
  days = 84,
  emptyColor = 'rgba(255,255,255,0.04)',
  fillColor = '#5B8DEF',
  reverse = false,
  title,
  legend,
  thresholds,
  formatTooltip,
}) => {
  const byDate = useMemo(() => {
    const m = new Map<string, HeatmapEntry>();
    for (const e of data) m.set(e.date, e);
    return m;
  }, [data]);

  const computedThresholds = useMemo(() => {
    if (thresholds && thresholds.length === 4) return thresholds;
    const vals = data.map(d => d.value).filter(v => v > 0).sort((a, b) => a - b);
    if (vals.length < 4) return [1, 2, 3, 4];
    const q = (p: number) => vals[Math.floor(vals.length * p)];
    return [q(0.2), q(0.4), q(0.6), q(0.8)];
  }, [data, thresholds]);

  const intensityColor = (value: number): string => {
    if (value <= 0) return emptyColor;
    let level = 0;
    for (let i = 0; i < computedThresholds.length; i++) {
      if (value > computedThresholds[i]) level = i + 1;
    }
    if (reverse) level = 4 - level;
    const opacities = [0.1, 0.25, 0.45, 0.7, 1.0];
    return fillColor + Math.round(opacities[level] * 255).toString(16).padStart(2, '0');
  };

  const cells = useMemo(() => {
    const today = startOfDay(new Date());
    const start = subDays(today, days - 1);
    // align to Sunday
    const startDay = start.getDay(); // 0 = Sun
    const gridStart = subDays(start, startDay);
    const totalDays = days + startDay;
    const weeks = Math.ceil(totalDays / 7);

    const grid: { date: Date; entry: HeatmapEntry | null; inWindow: boolean }[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: { date: Date; entry: HeatmapEntry | null; inWindow: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = addDays(gridStart, w * 7 + d);
        const key = format(dt, 'yyyy-MM-dd');
        col.push({
          date: dt,
          entry: byDate.get(key) ?? null,
          inWindow: dt >= start && dt <= today,
        });
      }
      grid.push(col);
    }
    return grid;
  }, [byDate, days]);

  const cellSize = 11;
  const gap = 2;

  return (
    <Box>
      {title && (
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
          {title}
        </Typography>
      )}
      <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
        <Box sx={{ display: 'inline-flex', gap: `${gap}px` }}>
          {cells.map((week, wi) => (
            <Stack key={wi} spacing={`${gap}px`}>
              {week.map((cell, di) => {
                const tooltip = cell.inWindow
                  ? (formatTooltip
                      ? formatTooltip(cell.entry, format(cell.date, 'yyyy-MM-dd'))
                      : `${format(cell.date, 'EEE MMM d')}${cell.entry ? ` — ${cell.entry.label ?? cell.entry.value}` : ' — no data'}`)
                  : '';
                const bg = cell.inWindow
                  ? intensityColor(cell.entry?.value ?? 0)
                  : 'transparent';
                return (
                  <Tooltip key={di} title={tooltip} placement="top" arrow disableHoverListener={!cell.inWindow}>
                    <Box
                      sx={{
                        width: cellSize,
                        height: cellSize,
                        bgcolor: bg,
                        borderRadius: '2px',
                        border: cell.inWindow ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        cursor: cell.inWindow ? 'pointer' : 'default',
                        transition: 'transform 0.1s',
                        '&:hover': cell.inWindow ? { transform: 'scale(1.4)' } : {},
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Stack>
          ))}
        </Box>
      </Box>
      {legend && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
          {legend}
        </Typography>
      )}
    </Box>
  );
};

export default ActivityHeatmap;
