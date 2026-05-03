import React, { useMemo } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Stack,
} from '@mui/material';
import { Transaction } from '../../hooks/useFinances';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  transactions: Transaction[];
  limit?: number;
}

interface ParsedTrade {
  id: string;
  date: string;
  action: 'BUY' | 'SELL' | 'DIV';
  ticker: string;
  shares: number | null;
  price: number | null;
  amount: number;
}

const TRADE_RE = /\b(buy|sell)\s+([\d.]+)\s+shares?\s+of\s+([A-Za-z0-9 ]+?)(?:\s+for|$)|^(?:Cash dividend|Dividend)\s+of\s+\$?([\d.]+)\s+from\s+([A-Z]+)/i;

const parseTrade = (tx: Transaction): ParsedTrade | null => {
  const desc = tx.description || '';
  const m = desc.match(TRADE_RE);
  if (!m) return null;

  if (m[1]) {
    // Buy/sell
    const action = m[1].toUpperCase() as 'BUY' | 'SELL';
    const shares = parseFloat(m[2]);
    const ticker = m[3].trim().toUpperCase();
    // Try to extract per-share price from "for $X.XX each"
    const priceMatch = desc.match(/for\s+\$?([\d.]+)\s+each/i);
    const price = priceMatch ? parseFloat(priceMatch[1]) : (shares > 0 ? Math.abs(tx.amount) / shares : null);
    return { id: tx.id, date: tx.date, action, ticker, shares, price, amount: tx.amount };
  }
  if (m[4] && m[5]) {
    // Dividend
    return {
      id: tx.id,
      date: tx.date,
      action: 'DIV',
      ticker: m[5].toUpperCase(),
      shares: null,
      price: null,
      amount: tx.amount,
    };
  }
  return null;
};

const actionColor = (action: ParsedTrade['action']) => {
  if (action === 'BUY') return '#FF9800';
  if (action === 'SELL') return '#4CAF50';
  return '#5B8DEF';
};

const RecentTradesCard: React.FC<Props> = ({ transactions, limit = 25 }) => {
  const trades = useMemo(() => {
    const parsed: ParsedTrade[] = [];
    for (const tx of transactions) {
      const t = parseTrade(tx);
      if (t) parsed.push(t);
    }
    return parsed.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }, [transactions, limit]);

  const buyCount = trades.filter(t => t.action === 'BUY').length;
  const sellCount = trades.filter(t => t.action === 'SELL').length;
  const divCount = trades.filter(t => t.action === 'DIV').length;
  const buyTotal = trades.filter(t => t.action === 'BUY').reduce((s, t) => s + Math.abs(t.amount), 0);
  const sellTotal = trades.filter(t => t.action === 'SELL').reduce((s, t) => s + t.amount, 0);
  const divTotal = trades.filter(t => t.action === 'DIV').reduce((s, t) => s + t.amount, 0);

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Typography variant="h6">Recent Activity</Typography>
          <Typography variant="caption" color="text.secondary">
            Last {trades.length} trades
          </Typography>
        </Box>

        <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Bought</Typography>
            <Typography variant="body1" fontWeight={600} color="#FF9800">
              {formatCurrency(buyTotal)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{buyCount} trades</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Sold</Typography>
            <Typography variant="body1" fontWeight={600} color="#4CAF50">
              {formatCurrency(sellTotal)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{sellCount} trades</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Dividends</Typography>
            <Typography variant="body1" fontWeight={600} color="#5B8DEF">
              {formatCurrency(divTotal)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{divCount} payouts</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Net</Typography>
            <Typography variant="body1" fontWeight={600} color={(sellTotal - buyTotal + divTotal) >= 0 ? 'success.main' : 'error.main'}>
              {(sellTotal - buyTotal + divTotal) >= 0 ? '+' : ''}{formatCurrency(sellTotal - buyTotal + divTotal)}
            </Typography>
          </Box>
        </Stack>

        {trades.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No buys/sells/dividends in transaction history.</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Ticker</TableCell>
                  <TableCell align="right">Shares</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trades.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Typography variant="caption">{formatDateShort(t.date)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.action}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: actionColor(t.action),
                          bgcolor: `${actionColor(t.action)}22`,
                          border: `1px solid ${actionColor(t.action)}44`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{t.ticker}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {t.shares !== null ? t.shares.toFixed(t.shares < 1 ? 4 : 2) : '--'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {t.price !== null ? formatCurrency(t.price) : '--'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} sx={{ color: t.amount < 0 ? '#FF9800' : '#4CAF50' }}>
                        {t.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(t.amount))}
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
