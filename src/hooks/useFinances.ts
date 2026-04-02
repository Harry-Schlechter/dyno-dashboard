import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { supabase, USER_ID } from '../lib/supabase';

export interface FinancialAccount {
  id: string;
  account_name: string;
  institution: string;
  account_type: string;
  account_subtype: string;
  current_balance: number;
  available_balance: number;
  last_four: string;
  is_active: boolean;
  is_asset: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant_name: string;
  amount: number;
  account_id: string;
  empower_category: string;
  custom_category: string | null;
  pending: boolean;
  tags: string[];
}

export interface InvestmentHolding {
  id: string;
  account_id: string;
  ticker: string;
  description: string;
  quantity: number;
  current_price: number;
  current_value: number;
  cost_basis: number;
  gain_loss: number;
  gain_loss_pct: number;
  asset_class: string;
}

export interface NetWorthSnapshot {
  id: string;
  date: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  breakdown: any;
  by_institution: any;
}

export const useFinances = () => {
  const accounts = useSupabase<FinancialAccount>({
    table: 'financial_accounts',
    order: { column: 'institution', ascending: true },
  });

  const transactions = useSupabase<Transaction>({
    table: 'financial_transactions',
    order: { column: 'date', ascending: false },
    limit: 200,
  });

  const holdings = useSupabase<InvestmentHolding>({
    table: 'investment_holdings',
    order: { column: 'current_value', ascending: false },
  });

  const netWorth = useSupabase<NetWorthSnapshot>({
    table: 'net_worth_snapshots',
    order: { column: 'date', ascending: false },
  });

  const monthlySpending = useSupabase<{ month: string; category: string; total: number }>({
    table: 'monthly_spending_by_category',
    isView: true,
  });

  const updateTransactionCategory = useCallback(async (id: string, category: string) => {
    const { error } = await supabase
      .from('financial_transactions')
      .update({ custom_category: category })
      .eq('id', id)
      .eq('user_id', USER_ID);
    if (!error) transactions.refetch();
    return error;
  }, [transactions.refetch]);

  return {
    accounts: accounts.data,
    transactions: transactions.data,
    holdings: holdings.data,
    netWorth: netWorth.data,
    monthlySpending: monthlySpending.data,
    loading: accounts.loading || transactions.loading || holdings.loading || netWorth.loading,
    error: accounts.error || transactions.error || holdings.error || netWorth.error,
    updateTransactionCategory,
    refetch: () => { accounts.refetch(); transactions.refetch(); holdings.refetch(); netWorth.refetch(); monthlySpending.refetch(); },
  };
};
