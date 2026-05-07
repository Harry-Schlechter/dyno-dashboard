import React, { useMemo } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Stack,
} from '@mui/material';
import { InvestmentActivity } from '../../hooks/useFinances';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  activity: InvestmentActivity[];
  limit?: number;
}

type DisplayKind = 'BUY' | 'SELL' | 'DIV' | '401K' | 'OTHER';

const kindLabel = (raw: InvestmentActivity['kind'], amount: number): DisplayKind => {
  if (raw === 'buy') return 'BUY';
  if (raw === 'sell') return 'SELL';
  if (raw === 'dividend') return 'DIV';
  if (raw === '401k') return '401K';
  // Fall back to sign of amount when kind is null/other
  if (raw === 'other' || raw === null) return amount < 0 ? 'BUY' : 'SELL';
  return 'OTHER';
};

const kindColor = (k: DisplayKind): string => {
  if (k === 'BUY') return '#FF9800';
  if (k === 'SELL') return '#4CAF50';
  if (k === 'DIV') return '#5B8DEF';
  if (k === '401K') return '#764ba2';
  return '#7d8590';
};

// Best-effort ticker extraction from description for display.
const extractTicker = (description: string | null, merchant: string | null): string => {
  const desc = description || '';
  // Pattern: "buy/sell N shares of TICKER" or "X shares of TICKER"
  const sharesMatch = desc.match(/shares?\s+of\s+([A-Z][A-Z0-9.\-]{0,7})\b/i);
  if (sharesMatch) return sharesMatch[1].toUpperCase();
  // Pattern: "Cash dividend of $X from TICKER"
  const divMatch = desc.match(/from\s+([A-Z][A-Z0-9.\-]{0,7})\b/);
  if (divMatch) return divMatch[1].toUpperCase();
  // Standalone ticker-looking word
  const standalone = desc.match(/\b([A-Z]{2,6})\b/);
  if (standalone) return standalone[1];
  return merchant || '—';
};

const RecentTradesCard: React.FC<Props> = ({ activity, limit = 25 }) => {
  const rows = useMemo(() => {
    return activity.slice(0, limit).map(a => ({
      id: a.id,
      date: a.date,
      kind: kindLabel(a.kind, a.amount),
      ticker: extractTicker(a.description, a.merchant_name),
      description: a.description || '',
      amount: a.amount,
    }));
  }, [activity, limit]);

  const buys    = rows.filter(r => r.kind === 'BUY');
  const sells   = rows.filter(r => r.kind === 'SELL');
  const divs    = rows.filter(r => r.kind === 'DIV');
  const fourOhOneK = rows.filter(r => r.kind === '401K');

  const buyTotal      = buys.reduce((s, r) => s + Math.abs(r.amount), 0);
  const sellTotal     = sells.reduce((s, r) => s + Math.abs(r.amount), 0);
  const divTotal      = divs.reduce((s, r) => s + Math.abs(r.amount), 0);
  const contribTotal  = fourOhOneK.reduce((s, r) => s + Math.abs(r.amount), 0);

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Typography variant="h6">Recent Activity</Typography>
          <Typography variant="caption" color="text.secondary">
            Last {rows.length} from financial_investment_activity
          </Typography>
        </Box>

        <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Bought</Typography>
            <Typography variant="body1" fontWeight={600} color="#FF9800">{formatCurrency(buyTotal)}</Typography>
            <Typography variant="caption" color="text.secondary">{buys.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Sold</Typography>
            <Typography variant="body1" fontWeight={600} color="#4CAF50">{formatCurrency(sellTotal)}</Typography>
            <Typography variant="caption" color="text.secondary">{sells.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Dividends</Typography>
            <Typography variant="body1" fontWeight={600} color="#5B8DEF">{formatCurrency(divTotal)}</Typography>
            <Typography variant="caption" color="text.secondary">{divs.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">401(k) contrib.</Typography>
            <Typography variant="body1" fontWeight={600} color="#764ba2">{formatCurrency(contribTotal)}</Typography>
            <Typography variant="caption" color="text.secondary">{fourOhOneK.length}</Typography>
          </Box>
        </Stack>

        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No investment activity yet. The sync drops 401k / buys / sells / dividends into <code>financial_investment_activity</code>; they'll appear here as they arrive.
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Kind</TableCell>
                  <TableCell>Ticker</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><Typography variant="caption">{formatDateShort(r.date)}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={r.kind}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: kindColor(r.kind),
                          bgcolor: `${kindColor(r.kind)}22`,
                          border: `1px solid ${kindColor(r.kind)}44`,
                        }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{r.ticker}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} sx={{ color: r.amount < 0 ? '#FF9800' : '#4CAF50' }}>
                        {r.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(r.amount))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTradesCard;
