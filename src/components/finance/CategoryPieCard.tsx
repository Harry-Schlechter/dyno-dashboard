import React, { useMemo, useState } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, Drawer, IconButton, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { Transaction } from '../../hooks/useFinances';
import { isRealSpend, spendByCategory, filterTransactionsByRange } from '../../lib/finance';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

const CHART_COLORS = ['#5B8DEF', '#764ba2', '#4CAF50', '#FF9800', '#F44336', '#90CAF9', '#FFB74D', '#81C784', '#E57373', '#64B5F6', '#CE93D8', '#A5D6A7'];

interface Props {
  transactions: Transaction[];
  startDate: string;
  endDate: string;
  rangeLabel: string;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
};

const CategoryPieCard: React.FC<Props> = ({ transactions, startDate, endDate, rangeLabel }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [drillCat, setDrillCat] = useState<string | null>(null);

  const inRange = useMemo(
    () => filterTransactionsByRange(transactions, startDate, endDate),
    [transactions, startDate, endDate],
  );

  const byCat = useMemo(() => spendByCategory(inRange), [inRange]);
  const total = byCat.reduce((s, c) => s + c.total, 0);

  const drillTxs = useMemo(() => {
    if (!drillCat) return [];
    return inRange
      .filter(isRealSpend)
      .filter(t => {
        const cat = (t.custom_category || 'uncategorized').toLowerCase() === 'uncategorized'
          ? 'uncategorized'
          : t.custom_category || 'uncategorized';
        return cat === drillCat;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [inRange, drillCat]);

  const drillTotal = drillTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="h6">Spending by Category</Typography>
          <Stack direction="row" spacing={2} alignItems="baseline">
            <Typography variant="caption" color="text.secondary">{rangeLabel}</Typography>
            <Typography variant="h6" fontWeight={700}>{formatCurrency(total)}</Typography>
          </Stack>
        </Box>

        {byCat.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No spending in this range</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
            <Box sx={{ width: { xs: '100%', md: '55%' }, height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCat}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    activeIndex={hoverIdx ?? undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, i) => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onClick={(d: any) => setDrillCat(d.category)}
                    style={{ cursor: 'pointer' }}
                  >
                    {byCat.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            <Stack spacing={0.75} sx={{ width: { xs: '100%', md: '45%' }, maxHeight: 320, overflowY: 'auto' }}>
              {byCat.map((c, i) => {
                const pct = total > 0 ? (c.total / total) * 100 : 0;
                return (
                  <Box
                    key={c.category}
                    onClick={() => setDrillCat(c.category)}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    sx={{
                      cursor: 'pointer',
                      px: 1.25, py: 0.75, borderRadius: 1.5,
                      bgcolor: hoverIdx === i ? 'rgba(255,255,255,0.06)' : 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }} noWrap>
                          {c.category.replace(/_/g, ' ')}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={600}>{formatCurrency(c.total)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pct.toFixed(1)}% · {c.count} tx
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}
      </CardContent>

      <Drawer
        anchor="right"
        open={drillCat !== null}
        onClose={() => setDrillCat(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, bgcolor: '#0d1117' } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {drillCat?.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="caption" color="text.secondary">{rangeLabel}</Typography>
            </Box>
            <IconButton onClick={() => setDrillCat(null)}><Close /></IconButton>
          </Box>

          <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(drillTotal)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Transactions</Typography>
              <Typography variant="h5" fontWeight={700}>{drillTxs.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Avg</Typography>
              <Typography variant="h5" fontWeight={700}>
                {drillTxs.length > 0 ? formatCurrency(drillTotal / drillTxs.length) : '--'}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Merchant</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillTxs.map(t => (
                  <TableRow key={t.id}>
                    <TableCell><Typography variant="caption">{formatDateShort(t.date)}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {t.merchant_name || t.description}
                      </Typography>
                      {t.merchant_name && t.description && t.description !== t.merchant_name && (
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          {t.description}
                        </Typography>
                      )}
                      {t.pending && <Chip label="Pending" size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.25 }} />}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(Math.abs(t.amount))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Drawer>
    </Card>
  );
};

export default CategoryPieCard;
