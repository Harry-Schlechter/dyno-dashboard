import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, ToggleButton, ToggleButtonGroup,
  TextField, Slider, Stack, Chip, Alert, Tabs, Tab, Divider,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  runProjection, defaultStages, DEFAULT_GLOBALS, STAGES, StageKey, StageLevers, Alloc,
} from '../../lib/projection';
import { FinancialAccount } from '../../hooks/useFinances';

const fmtK = (v: number) => `$${Math.round(v / 1000).toLocaleString()}k`;
const fmtFull = (v: number) => `$${Math.round(v).toLocaleString()}`;

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

const ProjectionTool: React.FC<{ accounts: FinancialAccount[] }> = ({ accounts }) => {
  // Live starting balances.
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

  const result = useMemo(
    () => runProjection({ ...start, ...globals, stages }),
    [start, globals, stages],
  );

  const stageKeys: StageKey[] = STAGES.map(s => s.key);
  const activeStage = stageKeys[tab];
  const sydneyEarns = activeStage !== 'now';

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
        Financial future — interactive projection
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Income is set (Harry's raises + Sydney's med-career arc). Tune spending & contributions per life stage; WROS absorbs the rest. Balances compound at {globals.returnPct}%.
      </Typography>

      {/* Milestone summary cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {result.milestones.map((m) => (
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

      {result.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
          {result.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </Alert>
      )}

      {/* Growth chart */}
      <Card sx={{ mb: 2, '&:hover': { transform: 'none' } }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Net worth trajectory</Typography>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={result.series}>
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

      {/* Per-stage levers */}
      <Card sx={{ '&:hover': { transform: 'none' } }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Allocations by life stage</Typography>
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
    </Box>
  );
};

export default ProjectionTool;
