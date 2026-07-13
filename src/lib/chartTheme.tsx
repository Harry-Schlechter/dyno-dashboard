import React from 'react';

// Shared recharts styling so every chart matches the dark theme and is legible.
// Fixes the bug where axis tick text rendered black/invisible on the dark bg.

export const AXIS_TICK = { fill: '#8b96a5', fontSize: 11 };
export const AXIS_LINE = { stroke: 'rgba(255,255,255,0.12)' };
export const GRID_STROKE = 'rgba(255,255,255,0.06)';
export const LEGEND_STYLE = { fontSize: 12, color: '#8b96a5' };

// Props to spread onto <XAxis>/<YAxis> for consistent, visible ticks.
export const xAxisProps = {
  tick: AXIS_TICK,
  stroke: 'rgba(255,255,255,0.12)',
  tickLine: false,
  axisLine: { stroke: 'rgba(255,255,255,0.12)' },
};
export const yAxisProps = {
  tick: AXIS_TICK,
  stroke: 'rgba(255,255,255,0.12)',
  tickLine: false,
  axisLine: false as const,
};

// A modern, glassy tooltip matching the site. Use as <Tooltip content={<ChartTooltip />} />.
// Optional `formatter` maps (value, name) → [displayValue, displayName].
export const ChartTooltip: React.FC<any> = ({
  active, payload, label, formatter, labelFormatter,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(18, 24, 33, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: '9px 12px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        fontSize: 12,
      }}
    >
      {label != null && (
        <div style={{ color: '#e6edf3', fontWeight: 600, marginBottom: 6 }}>
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((p: any, i: number) => {
        const [val, name] = formatter
          ? formatter(p.value, p.name, p)
          : [p.value, p.name];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.stroke || p.fill, flexShrink: 0 }} />
            <span style={{ color: '#8b96a5' }}>{name}</span>
            <span style={{ color: '#e6edf3', fontWeight: 600, marginLeft: 'auto' }}>{val}</span>
          </div>
        );
      })}
    </div>
  );
};
