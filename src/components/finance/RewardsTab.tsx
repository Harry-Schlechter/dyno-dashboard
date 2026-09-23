import React, { useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Divider, Alert,
} from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { Transaction } from '../../hooks/useFinances';
import { formatCurrency } from '../../lib/formatters';
import { isRealSpend, SpendCategory } from '../../lib/finance';
import { CARD_LIST, CARD_BENEFIT_VALUE, CardMeta } from '../../lib/cardRewards';

// Live point balances — not in Supabase (no schema for it), updated by hand
// alongside the benefits/*.md captures. Last refreshed 2026-09-22.
const POINT_BALANCES: Record<string, number> = {
  chase_sapphire_preferred: 44015, // combined Ultimate Rewards balance across both Chase cards
  chase_freedom_unlimited: 0,      // pools into the Sapphire Preferred balance above, not counted twice
  amex_gold: 259347,
  citi_custom_cash: 42173,
  capone_venture_x: 1584,
};

interface Props {
  transactions: Transaction[];
}

interface CardSpendRow {
  card: CardMeta;
  totalSpend: number;
  categorySpend: Partial<Record<SpendCategory, number>>;
}

const RewardsTab: React.FC<Props> = ({ transactions }) => {
  // Trailing 12 months of real spend, split by card and category.
  const cardSpend: CardSpendRow[] = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return CARD_LIST.map(card => {
      const cardTxns = transactions.filter(
        t => t.account_id === card.accountId && t.date >= cutoffStr && isRealSpend(t)
      );
      const categorySpend: Partial<Record<SpendCategory, number>> = {};
      let totalSpend = 0;
      for (const t of cardTxns) {
        const cat = (t.custom_category || 'uncategorized') as SpendCategory;
        const amt = Math.abs(t.amount);
        categorySpend[cat] = (categorySpend[cat] || 0) + amt;
        totalSpend += amt;
      }
      return { card, totalSpend, categorySpend };
    });
  }, [transactions]);

  // Whole-wallet spend by category (all 5 cards combined) — needed to find
  // the best card per category regardless of where Harry currently puts it.
  const walletCategoryTotals = useMemo(() => {
    const totals: Partial<Record<SpendCategory, number>> = {};
    for (const row of cardSpend) {
      for (const [cat, amt] of Object.entries(row.categorySpend)) {
        totals[cat as SpendCategory] = (totals[cat as SpendCategory] || 0) + (amt || 0);
      }
    }
    return totals;
  }, [cardSpend]);

  const topCategories = useMemo(
    () =>
      Object.entries(walletCategoryTotals)
        .filter(([cat]) => cat !== 'uncategorized')
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 6) as [SpendCategory, number][],
    [walletCategoryTotals]
  );

  // For each top category, which card earns the best rate, and how much
  // better is it than what Harry's actually using (his highest-rate card
  // that's actually eligible, approximated as "best rate among the 5").
  const categoryRecommendations = useMemo(() => {
    return topCategories.map(([cat, annualSpend]) => {
      const rates = CARD_LIST.map(card => ({
        card,
        rate: card.categoryRates[cat] ?? card.baseRate,
      })).sort((a, b) => b.rate - a.rate);
      const best = rates[0];
      const secondBest = rates[1];
      const extraPoints = (best.rate - secondBest.rate) * annualSpend;
      const extraValue = (extraPoints * best.card.centsPerPoint) / 100;
      return { category: cat, annualSpend, best, secondBest, extraValue };
    });
  }, [topCategories]);

  const cardValueSummary = useMemo(() => {
    return CARD_LIST.map(card => {
      const benefitLines = CARD_BENEFIT_VALUE[card.id] || [];
      const benefitValue = benefitLines.reduce((s, l) => s + l.annualValue, 0);
      const pointBalance = POINT_BALANCES[card.id] || 0;
      const pointBalanceValue = (pointBalance * card.centsPerPoint) / 100;
      const netOfFee = benefitValue - card.annualFee;
      return { card, benefitLines, benefitValue, pointBalance, pointBalanceValue, netOfFee };
    });
  }, []);

  const totalPointValue = cardValueSummary.reduce((s, c) => s + c.pointBalanceValue, 0);
  const totalAnnualFees = CARD_LIST.reduce((s, c) => s + c.annualFee, 0);
  const totalBenefitValue = cardValueSummary.reduce((s, c) => s + c.benefitValue, 0);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Point balances and card metadata are captured by hand (last refreshed 2026-09-22), not synced live — Supabase has no schema for reward points. Category earn-rate comparisons use the last 12 months of real spend.
      </Alert>

      {/* ═══════════════ SUMMARY STRIP ═══════════════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Total point/mile value</Typography>
              <Typography variant="h4" fontWeight={700}>{formatCurrency(totalPointValue)}</Typography>
              <Typography variant="caption" color="text.secondary">across all 5 cards, at TPG Sept 2026 valuations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Total annual fees</Typography>
              <Typography variant="h4" fontWeight={700}>{formatCurrency(totalAnnualFees)}</Typography>
              <Typography variant="caption" color="text.secondary">Amex Gold $325 + Venture X $395 + Sapphire Preferred $95</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Benefit value vs. fees</Typography>
              <Typography variant="h4" fontWeight={700} color={totalBenefitValue >= totalAnnualFees ? 'success.main' : 'error.main'}>
                {formatCurrency(totalBenefitValue - totalAnnualFees)}
              </Typography>
              <Typography variant="caption" color="text.secondary">{formatCurrency(totalBenefitValue)} in credits/perks minus fees</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ═══════════════ POINT BALANCES ═══════════════ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Point & mile balances</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Card</TableCell>
                  <TableCell>Currency</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell align="right">Est. value</TableCell>
                  <TableCell align="right">¢/point</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cardValueSummary
                  .filter(c => (POINT_BALANCES[c.card.id] || 0) > 0)
                  .map(c => (
                    <TableRow key={c.card.id}>
                      <TableCell>{c.card.label}</TableCell>
                      <TableCell>{c.card.pointCurrency}</TableCell>
                      <TableCell align="right">{c.pointBalance.toLocaleString()}</TableCell>
                      <TableCell align="right">{formatCurrency(c.pointBalanceValue)}</TableCell>
                      <TableCell align="right">{c.card.centsPerPoint}¢</TableCell>
                    </TableRow>
                  ))}
                <TableRow>
                  <TableCell colSpan={3}><Typography fontWeight={700}>Total</Typography></TableCell>
                  <TableCell align="right"><Typography fontWeight={700}>{formatCurrency(totalPointValue)}</Typography></TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ═══════════════ PER-CARD VALUE ═══════════════ */}
      <Typography variant="h6" sx={{ mb: 2 }}>Card-by-card value</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cardValueSummary.map(c => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={c.card.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{c.card.label}</Typography>
                  <Chip
                    size="small"
                    label={c.card.annualFee === 0 ? 'No annual fee' : `${formatCurrency(c.card.annualFee)}/yr`}
                    color={c.card.annualFee === 0 ? 'success' : 'default'}
                  />
                </Stack>
                {c.benefitLines.length > 0 ? (
                  <>
                    <Table size="small">
                      <TableBody>
                        {c.benefitLines.map(line => (
                          <TableRow key={line.label} sx={{ '& td': { border: 0, py: 0.25 } }}>
                            <TableCell sx={{ pl: 0 }}>
                              <Typography variant="body2" color={line.status === 'unenrolled' ? 'text.secondary' : 'text.primary'}>
                                {line.label}
                                {line.status === 'unenrolled' && ' (not activated)'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ pr: 0 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {line.annualValue > 0 ? formatCurrency(line.annualValue) : '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Divider sx={{ my: 1 }} />
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No flat-credit benefits — value is purely from the earn rate.
                  </Typography>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Net of fee</Typography>
                  <Typography variant="body2" fontWeight={700} color={c.netOfFee >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(c.netOfFee)}
                  </Typography>
                </Stack>
                {c.card.notes && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {c.card.notes}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ═══════════════ BEST CARD PER CATEGORY ═══════════════ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <TrendingUp fontSize="small" />
            <Typography variant="h6">Which card wins by category</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Based on trailing 12 months of real spend across all 5 cards, ranked by total spend in each category.
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Annual spend</TableCell>
                  <TableCell>Best card</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell>Next best</TableCell>
                  <TableCell align="right">Extra value/yr</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categoryRecommendations.map(rec => (
                  <TableRow key={rec.category}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{rec.category}</TableCell>
                    <TableCell align="right">{formatCurrency(rec.annualSpend)}</TableCell>
                    <TableCell>
                      <Chip size="small" color="success" label={rec.best.card.label} />
                    </TableCell>
                    <TableCell align="right">{rec.best.rate}x</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {rec.secondBest.card.label} ({rec.secondBest.rate}x)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color={rec.extraValue > 0 ? 'success.main' : 'text.secondary'}>
                        {rec.extraValue > 0 ? `+${formatCurrency(rec.extraValue)}` : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            "Extra value" = (best rate − next best rate) × category spend × the best card's point value. This is the annual upside of always using the winning card for that category instead of the next-best one.
          </Typography>
        </CardContent>
      </Card>

      {/* ═══════════════ ACTUAL SPEND BY CARD ═══════════════ */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Where spend is actually going (trailing 12mo)</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Card</TableCell>
                  <TableCell align="right">Total spend</TableCell>
                  <TableCell align="right">Est. points/miles earned</TableCell>
                  <TableCell align="right">Est. value earned</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cardSpend
                  .filter(r => r.totalSpend > 0)
                  .sort((a, b) => b.totalSpend - a.totalSpend)
                  .map(r => {
                    let pointsEarned = 0;
                    for (const [cat, amt] of Object.entries(r.categorySpend)) {
                      const rate = r.card.categoryRates[cat as SpendCategory] ?? r.card.baseRate;
                      pointsEarned += (amt || 0) * rate;
                    }
                    const valueEarned = (pointsEarned * r.card.centsPerPoint) / 100;
                    return (
                      <TableRow key={r.card.id}>
                        <TableCell>{r.card.label}</TableCell>
                        <TableCell align="right">{formatCurrency(r.totalSpend)}</TableCell>
                        <TableCell align="right">{Math.round(pointsEarned).toLocaleString()}</TableCell>
                        <TableCell align="right">{formatCurrency(valueEarned)}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RewardsTab;
