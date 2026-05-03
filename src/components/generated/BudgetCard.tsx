import React from 'react';
import { Card, CardContent, Box, Typography, LinearProgress } from '@mui/material';

interface BudgetItem {
  label: string;
  amount: number;
  color?: string;
}

interface Props {
  title?: string;
  items: BudgetItem[];
  total?: number;
  /** Optional cap for the bar — defaults to sum of items. */
  budget?: number;
  /** ISO currency or symbol; defaults to '$'. */
  currencySymbol?: string;
}

const BudgetCard: React.FC<Props> = ({ title = 'Budget', items, total, budget, currencySymbol = '$' }) => {
  const sum = items.reduce((s, i) => s + i.amount, 0);
  const grand = total ?? sum;
  const cap = budget ?? grand;
  const fmt = (n: number) => currencySymbol + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            {title}
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {fmt(grand)}
          </Typography>
        </Box>

        {budget !== undefined && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (grand / cap) * 100)}
              sx={{
                height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: grand <= cap ? '#4CAF50' : '#F44336',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
              {fmt(grand)} of {fmt(cap)} budgeted
            </Typography>
          </Box>
        )}

        <Box>
          {items.map((it, i) => {
            const pct = sum === 0 ? 0 : (it.amount / sum) * 100;
            return (
              <Box key={i} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{it.label}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>{fmt(it.amount)}</Typography>
                </Box>
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${pct}%`,
                      bgcolor: it.color ?? '#5B8DEF',
                      transition: 'width 0.4s',
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;
