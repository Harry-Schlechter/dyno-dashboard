import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, ToggleButton, ToggleButtonGroup,
  TextField, Slider, Stack, Chip, Alert, Tabs, Tab, Divider, Collapse, IconButton, Tooltip,
} from '@mui/material';
import { KeyboardArrowRight, KeyboardArrowDown } from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  runProjection, defaultStages, DEFAULT_GLOBALS, STAGES, StageKey, StageLevers, Alloc, MonthPoint,
} from '../../lib/projection';
import { FinancialAccount } from '../../hooks/useFinances';
import { useProjectionSnapshots, ProjectionSnapshotRow } from '../../hooks/useProjectionSnapshots';

const fmtK = (v: number) => `$${Math.round(v / 1000).toLocaleString()}k`;
const fmtFull = (v: number) => `$${Math.round(v).toLocaleString()}`;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A single allocation control: Max | Off | a $ amount.
const AllocControl: React.FC<{
  label: string; value: Alloc; onChange: (a: Alloc) => void; disabled?: boolean;
}> = ({ label, value, onChange, disabled }) => (
  <Box sx={{ opacity: disabled ? 0.4 : 1 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
    <Stack direction="row" spacing={0.75} alignItems="center">
      <ToggleButtonGroup
        size="small" exclusive disabled={disabled}
        value={value.mode === 'max' ? 'max' : value.amount === 0 ? 'off' : 'amt'}
        onChange={(_, v) => {
          if (!v) return;
          if (v === 'max') onChange({ mode: 'max', amount: 0 });
          else if (v === 'off') onChange({ mode: 'amount', amount: 0 });
          else onChange({ mode: 'amount', amount: value.amount || 500 });
        }}
      >
        <ToggleButton value="max" sx={{ textTransform: 'none', px: 1 }}>Max</ToggleButton>
        <ToggleButton value="amt" sx={{ textTransform: 'none', px: 1 }}>Set</ToggleButton>
        <ToggleButton value="off" sx={{ textTransform: 'none', px: 1 }}>$0</ToggleButton>
      </ToggleButtonGroup>
      {value.mode === 'amount' && value.amount > 0 && (
        <TextField
          size="small" type="number" disabled={disabled}
          value={value.amount}
          onChange={(e) => onChange({ mode: 'amount', amount: Math.max(0, +e.target.value) })}
          InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography>, sx: { fontSize: '0.8rem' } }}
          sx={{ width: 100, '& input': { py: 0.5 } }}
        />
      )}
      {value.mode === 'max' && <Chip size="small" label="IRS max" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(76,175,80,0.15)', color: '#4CAF50' }} />}
    </Stack>
  </Box>
);

const StagePanel: React.FC<{
  stageKey: StageKey; levers: StageLevers; onChange: (l: StageLevers) => void; sydneyEarns: boolean;
}> = ({ levers, onChange, sydneyEarns }) => {
  const set = (patch: Partial<StageLevers>) => onChange({ ...levers, ...patch });
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}><AllocControl label="Harry 401(k)" value={levers.harry401k} onChange={(a) => set({ harry401k: a })} /></Grid>
        <Grid size={{ xs: 6 }}><AllocControl label="Sydney 401(k)" value={levers.sydney401k} onChange={(a) => set({ sydney401k: a })} disabled={!sydneyEarns} /></Grid>
        <Grid size={{ xs: 6 }}><AllocControl label="HSA" value={levers.hsa} onChange={(a) => set({ hsa: a })} /></Grid>
        <Grid size={{ xs: 6 }} />
        <Grid size={{ xs: 6 }}><AllocControl label="Backdoor Roth #1" value={levers.roth1} onChange={(a) => set({ roth1: a })} /></Grid>
        <Grid size={{ xs: 6 }}><AllocControl label="Backdoor Roth #2" value={levers.roth2} onChange={(a) => set({ roth2: a })} /></Grid>
      </Grid>
      <Box>
        <Typography variant="caption" color="text.secondary">Spending: <b>{fmtFull(levers.spendMonthly)}/mo</b> {sydneyEarns ? '(+ rent, auto)' : ''}</Typography>
        <Slider size="small" min={3000} max={12000} step={100} value={levers.spendMonthly}
          onChange={(_, v) => set({ spendMonthly: v as number })} sx={{ mt: 0.5 }} />
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
        Everything left after taxes, these contributions, and spending flows into Joint WROS.
      </Typography>
    </Stack>
  );
};

const fmtContrib = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v).toLocaleString()}`;

// One cell showing a balance, the month's contribution into it (+$X in), and
// (for actuals) the delta vs plan.
const DeltaCell: React.FC<{ value: number; contrib?: number; plan?: number; isActual?: boolean; bold?: boolean }> = ({ value, contrib, plan, isActual, bold }) => {
  const delta = plan !== undefined ? value - plan : null;
  const color = delta === null ? 'inherit' : delta >= 0 ? '#4CAF50' : '#F44336';
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Typography variant="caption" fontWeight={bold ? 800 : 600} sx={{ display: 'block' }}>
        {fmtK(value)}
      </Typography>
      {contrib !== undefined && contrib > 0 && (
        <Typography variant="caption" sx={{ color: '#5B8DEF', fontSize: '0.6rem', display: 'block' }}>
          +{fmtContrib(contrib)} in
        </Typography>
      )}
      {isActual && delta !== null && Math.abs(delta) >= 50 && (
        <Typography variant="caption" sx={{ color, fontSize: '0.62rem', display: 'block' }}>
          {delta >= 0 ? '+' : ''}{fmtK(delta)} vs plan
        </Typography>
      )}
    </Box>
  );
};

const ProjectionTool: React.FC<{ accounts: FinancialAccount[] }> = ({ accounts }) => {
  const snaps = useProjectionSnapshots();

  // Live starting balances (fallback when no snapshot exists yet).
  const start = useMemo(() => {
    const bal = (pred: (a: FinancialAccount) => boolean) =>
      accounts.filter(a => a.is_active !== false && pred(a)).reduce((s, a) => s + (a.current_balance || 0), 0);
    return {
      start401k: bal(a => a.account_subtype === '401k'),
      startRoth: bal(a => (a.account_subtype || '').startsWith('roth_ira')),
      startHSA: bal(a => /hsa/i.test(a.account_name) && a.account_type === 'brokerage'),
      startWROS: bal(a => a.account_name === 'Joint WROS Brokerage'),
    };
  }, [accounts]);

  const [stages, setStages] = useState(defaultStages());
  const [globals, setGlobals] = useState(DEFAULT_GLOBALS);
  const [tab, setTab] = useState(0);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // BASELINE — the locked aspirational plan (default allocations). Drives the
  // top cards + graph + the table's "Plan" column. NOT affected by the sliders.
  const baseline = useMemo(
    () => runProjection({ ...start, ...DEFAULT_GLOBALS, stages: defaultStages() }),
    [start],
  );

  // SCENARIO — re-anchored off the latest REAL snapshot balance (so the forward
  // line starts from where we actually are), then driven by the current sliders.
  const scenario = useMemo(() => {
    const latest = snaps.latest;
    if (latest) {
      const [ay, am] = latest.month.split('-').map(Number);
      return runProjection({
        start401k: latest.k401, startRoth: latest.roth, startHSA: latest.hsa, startWROS: latest.wros,
        ...globals, stages, anchorYM: [ay, am],
      });
    }
    return runProjection({ ...start, ...globals, stages });
  }, [start, globals, stages, snaps.latest]);

  // Plan lookups keyed by 'YYYY-MM' and by year (December value).
  const planByYM = useMemo(() => {
    const m = new Map<string, MonthPoint>();
    for (const p of baseline.monthly) m.set(p.ym, p);
    return m;
  }, [baseline.monthly]);

  const scenarioByYM = useMemo(() => {
    const m = new Map<string, MonthPoint>();
    for (const p of scenario.monthly) m.set(p.ym, p);
    return m;
  }, [scenario.monthly]);

  const stageKeys: StageKey[] = STAGES.map(s => s.key);
  const activeStage = stageKeys[tab];
  const sydneyEarns = activeStage !== 'now';

  const nowYM = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Build the table rows: one per year, each with its 12 months.
  const years = useMemo(() => Array.from({ length: 2036 - 2026 + 1 }, (_, i) => 2026 + i), []);

  // For a given YM, resolve the row's displayed values + whether it's actual.
  // c* = contribution INTO each bucket that month (actual snapshot or projected).
  type Row = {
    ym: string; label: string; isActual: boolean;
    k401: number; roth: number; hsa: number; wros: number; net: number;
    c401: number; cRoth: number; cHsa: number; cWros: number;
    planNet?: number; planWros?: number;
  };
  const resolveMonth = (year: number, month: number): Row | null => {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const snap = snaps.byMonth.get(ym);
    const plan = planByYM.get(ym);
    const isActual = !!snap && ym <= nowYM;
    if (isActual && snap) {
      return {
        ym, label: MONTH_NAMES[month - 1], isActual: true,
        k401: snap.k401, roth: snap.roth, hsa: snap.hsa, wros: snap.wros, net: snap.net_worth,
        c401: snap.contrib_401k, cRoth: snap.contrib_roth, cHsa: snap.contrib_hsa, cWros: snap.contrib_wros,
        planNet: plan?.net, planWros: plan?.wros,
      };
    }
    const proj = scenarioByYM.get(ym);
    if (!proj) return null;
    return {
      ym, label: MONTH_NAMES[month - 1], isActual: false,
      k401: proj.k401, roth: proj.roth, hsa: proj.hsa, wros: proj.wros, net: proj.net,
      c401: proj.in401k, cRoth: proj.inRoth, cHsa: proj.inHsa, cWros: proj.inWros,
      planNet: plan?.net, planWros: plan?.wros,
    };
  };

  // Year summary: balances = latest available month; contributions = SUM over
  // the year (what actually/projected went in across all 12 months).
  const resolveYear = (year: number): Row | null => {
    let summary: Row | null = null;
    const totals = { c401: 0, cRoth: 0, cHsa: 0, cWros: 0 };
    for (let m = 1; m <= 12; m++) {
      const r = resolveMonth(year, m);
      if (!r) continue;
      totals.c401 += r.c401; totals.cRoth += r.cRoth; totals.cHsa += r.cHsa; totals.cWros += r.cWros;
      summary = r; // keep the latest month's balances
    }
    if (!summary) return null;
    return { ...summary, ...totals, label: `${year}` };
  };

  const anchorNote = snaps.latest
    ? `Projection re-anchored from your ${snaps.latest.month} balances.`
    : 'No monthly snapshot yet — projecting from current live balances.';

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
        Financial future — plan vs. reality
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Cards & chart show the <b>locked plan</b> (target maxes, ${'{'}5,100{'}'}/mo spend) and your real snapshots — they don't move when you play with the sliders. The <b>table below</b> is where you experiment: change future allocations and watch the years recompute.
      </Typography>

      {/* ── FIXED TOP: baseline plan + real data (not touched by sliders) ── */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {baseline.milestones.map((m) => (
          <Grid size={{ xs: 12, md: 4 }} key={m.year}>
            <Card sx={{ borderLeft: '3px solid #5B8DEF', '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{m.label} · {m.year}</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#5B8DEF', my: 0.5 }}>{fmtFull(m.netWorth)}</Typography>
                <Stack spacing={0.25}>
                  {[['401(k)', m.k401, '#764ba2'], ['Roth', m.roth, '#90CAF9'], ['HSA', m.hsa, '#9575CD'], ['WROS', m.wros, '#FF9800']].map(([l, v, c]) => (
                    <Box key={l as string} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: c as string }}>{l as string}</Typography>
                      <Typography variant="caption" fontWeight={600}>{fmtK(v as number)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Growth chart — baseline plan only */}
      <Card sx={{ mb: 2, '&:hover': { transform: 'none' } }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Net worth trajectory — the plan</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={baseline.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="year" stroke="rgba(255,255,255,0.12)" tick={{ fill: '#8b96a5', fontSize: 11 }} />
              <YAxis tickFormatter={fmtK} stroke="rgba(255,255,255,0.12)" tick={{ fill: '#8b96a5', fontSize: 11 }} />
              <RTooltip formatter={(v: any) => fmtFull(v)} contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="wros" stackId="1" name="WROS" stroke="#FF9800" fill="#FF980033" />
              <Area type="monotone" dataKey="k401" stackId="1" name="401(k)" stroke="#764ba2" fill="#764ba233" />
              <Area type="monotone" dataKey="roth" stackId="1" name="Roth" stroke="#90CAF9" fill="#90CAF933" />
              <Area type="monotone" dataKey="hsa" stackId="1" name="HSA" stroke="#9575CD" fill="#9575CD33" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── MIDDLE: the levers (drive the table below) ── */}
      <Card sx={{ mb: 2, '&:hover': { transform: 'none' } }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Experiment — allocations by life stage</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, minHeight: 36 }}>
            {STAGES.map((s) => <Tab key={s.key} label={s.label} sx={{ textTransform: 'none', minHeight: 36 }} />)}
          </Tabs>
          <StagePanel
            stageKey={activeStage}
            levers={stages[activeStage]}
            onChange={(l) => setStages({ ...stages, [activeStage]: l })}
            sydneyEarns={sydneyEarns}
          />
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">Investment return: <b>{globals.returnPct}%</b></Typography>
              <Slider size="small" min={3} max={10} step={0.5} value={globals.returnPct}
                onChange={(_, v) => setGlobals({ ...globals, returnPct: v as number })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">Spend inflation: <b>{globals.spendInflationPct}%</b></Typography>
              <Slider size="small" min={0} max={8} step={0.5} value={globals.spendInflationPct}
                onChange={(_, v) => setGlobals({ ...globals, spendInflationPct: v as number })} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {scenario.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
          {scenario.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </Alert>
      )}

      {/* ── BOTTOM: the year-by-year compliance table (this is what the sliders drive) ── */}
      <Card sx={{ '&:hover': { transform: 'none' } }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle2">Year by year — plan vs. actual vs. your scenario</Typography>
            <Typography variant="caption" color="text.secondary">{anchorNote}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Each cell shows the <b>balance</b>, the <span style={{ color: '#5B8DEF' }}>contribution that period</span>, and (past months) <span style={{ color: '#4CAF50' }}>green</span>/<span style={{ color: '#F44336' }}>red</span> vs the plan. Year rows sum the year's contributions. Click a year for its months; future rows recompute as you change the levers.
          </Typography>

          {/* Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr repeat(5, minmax(56px, 1fr))', gap: 0.5, px: 1, py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Box />
            <Typography variant="caption" color="text.secondary" fontWeight={700}>Period</Typography>
            {['401(k)', 'Roth', 'HSA', 'WROS', 'Net worth'].map(h => (
              <Typography key={h} variant="caption" color="text.secondary" fontWeight={700} sx={{ textAlign: 'right' }}>{h}</Typography>
            ))}
          </Box>

          {years.map(year => {
            const yr = resolveYear(year);
            if (!yr) return null;
            const open = expandedYear === year;
            const anyActual = yr.isActual;
            return (
              <Box key={year}>
                {/* Year row */}
                <Box
                  onClick={() => setExpandedYear(open ? null : year)}
                  sx={{
                    display: 'grid', gridTemplateColumns: '28px 1fr repeat(5, minmax(56px, 1fr))', gap: 0.5,
                    px: 1, py: 0.9, cursor: 'pointer', alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    bgcolor: open ? 'rgba(91,141,239,0.06)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                  }}
                >
                  <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
                    {open ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
                  </IconButton>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" fontWeight={700}>{year}</Typography>
                    {anyActual && <Chip size="small" label="actual" sx={{ height: 16, fontSize: '0.55rem', bgcolor: 'rgba(76,175,80,0.15)', color: '#4CAF50' }} />}
                  </Box>
                  <DeltaCell value={yr.k401} contrib={yr.c401} bold />
                  <DeltaCell value={yr.roth} contrib={yr.cRoth} bold />
                  <DeltaCell value={yr.hsa} contrib={yr.cHsa} bold />
                  <DeltaCell value={yr.wros} contrib={yr.cWros} plan={yr.planWros} isActual={yr.isActual} bold />
                  <DeltaCell value={yr.net} plan={yr.planNet} isActual={yr.isActual} bold />
                </Box>

                {/* Month rows */}
                <Collapse in={open} unmountOnExit>
                  <Box sx={{ bgcolor: 'rgba(0,0,0,0.15)' }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                      const r = resolveMonth(year, month);
                      if (!r) return null;
                      return (
                        <Box key={month} sx={{
                          display: 'grid', gridTemplateColumns: '28px 1fr repeat(5, minmax(56px, 1fr))', gap: 0.5,
                          px: 1, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}>
                          <Box />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                            <Typography variant="caption" color="text.secondary">{r.label}</Typography>
                            {r.isActual
                              ? <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4CAF50' }} />
                              : <Tooltip title="projected"><Box sx={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)' }} /></Tooltip>}
                          </Box>
                          <DeltaCell value={r.k401} contrib={r.c401} />
                          <DeltaCell value={r.roth} contrib={r.cRoth} />
                          <DeltaCell value={r.hsa} contrib={r.cHsa} />
                          <DeltaCell value={r.wros} contrib={r.cWros} plan={r.planWros} isActual={r.isActual} />
                          <DeltaCell value={r.net} plan={r.planNet} isActual={r.isActual} />
                        </Box>
                      );
                    })}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectionTool;
