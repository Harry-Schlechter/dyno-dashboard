import { useMemo } from 'react';
import { Transaction, useFinances } from './useFinances';
import {
  DEFAULT_SEMI_MONTHLY_PAYCHECK,
  MonthProjection,
  projectCurrentMonth,
  trailingMonthlyAvgSpend,
  spendByCategory,
  CategorySpend,
  isRealSpend,
} from '../lib/finance';

interface Options {
  semiMonthlyPaycheck?: number;
  today?: Date;
}

interface FinanceProjection {
  projection: MonthProjection;
  trailingAvgSpend: number;
  vsAvgPct: number | null;        // projected month spend vs trailing 3-month avg
  currentMonthCategories: CategorySpend[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  rawTransactions: Transaction[];
}

export const useFinanceProjection = ({
  semiMonthlyPaycheck = DEFAULT_SEMI_MONTHLY_PAYCHECK,
  today = new Date(),
}: Options = {}): FinanceProjection => {
  const { transactions, loading, error, refetch } = useFinances();

  const projection = useMemo(
    () => projectCurrentMonth(transactions, today, semiMonthlyPaycheck),
    [transactions, today, semiMonthlyPaycheck],
  );

  const trailingAvgSpend = useMemo(
    () => trailingMonthlyAvgSpend(transactions, today, 3),
    [transactions, today],
  );

  const vsAvgPct = useMemo(() => {
    if (trailingAvgSpend === 0) return null;
    return ((projection.projectedMonthSpend - trailingAvgSpend) / trailingAvgSpend) * 100;
  }, [projection.projectedMonthSpend, trailingAvgSpend]);

  const currentMonthCategories = useMemo(() => {
    const inMonth = transactions.filter(t => t.date.startsWith(projection.monthKey) && isRealSpend(t));
    return spendByCategory(inMonth);
  }, [transactions, projection.monthKey]);

  return {
    projection,
    trailingAvgSpend,
    vsAvgPct,
    currentMonthCategories,
    loading,
    error,
    refetch,
    rawTransactions: transactions,
  };
};
