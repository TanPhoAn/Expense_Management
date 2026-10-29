import { HealthScoreGrade } from '@/types';

export interface ScoreInput {
  income: number;
  expense: number;
  budgets?: { budgetAmount: number; spentAmount: number }[];
}

export interface ScoreResult {
  score: number;
  grade: HealthScoreGrade;
  gradeLabel: string;
  savingsRate: number;
  expenseRatio: number;
  budgetAdherenceRate: number;
  hasOverspentBudget: boolean;
}

/**
 * Calculates personal financial health score (0 - 100) based on 50/30/20 principles.
 */
export function calculateFinancialHealthScore(input: ScoreInput): ScoreResult {
  const { income, expense, budgets = [] } = input;

  // Edge case: No financial activity yet in the period
  if (income <= 0 && expense <= 0) {
    return {
      score: 70,
      grade: 'GOOD',
      gradeLabel: 'Tốt',
      savingsRate: 0,
      expenseRatio: 0,
      budgetAdherenceRate: 100,
      hasOverspentBudget: false,
    };
  }

  // Edge case: Zero income with expenses -> High risk
  if (income <= 0 && expense > 0) {
    return {
      score: 15,
      grade: 'AT_RISK',
      gradeLabel: 'Báo động',
      savingsRate: -100,
      expenseRatio: 999,
      budgetAdherenceRate: budgets.length > 0 ? (budgets.filter(b => b.spentAmount <= b.budgetAmount).length / budgets.length) * 100 : 0,
      hasOverspentBudget: budgets.some(b => b.spentAmount > b.budgetAmount),
    };
  }

  const savings = income - expense;
  const rawSavingsRate = (savings / income) * 100;
  const savingsRate = Math.round(rawSavingsRate * 10) / 10;
  const rawExpenseRatio = (expense / income) * 100;
  const expenseRatio = Math.round(rawExpenseRatio * 10) / 10;

  // 1. Savings Rate Component (Max 40 points)
  let savingsScore = 0;
  if (savingsRate >= 30) {
    savingsScore = 40;
  } else if (savingsRate >= 20) {
    savingsScore = 35;
  } else if (savingsRate >= 10) {
    savingsScore = 25;
  } else if (savingsRate >= 0) {
    savingsScore = 15;
  } else {
    // Negative cashflow
    savingsScore = 0;
  }

  // 2. Safe Expense Ratio Component (Max 30 points)
  let expenseScore = 0;
  if (expenseRatio <= 50) {
    expenseScore = 30;
  } else if (expenseRatio <= 70) {
    expenseScore = 25;
  } else if (expenseRatio <= 85) {
    expenseScore = 15;
  } else if (expenseRatio <= 100) {
    expenseScore = 8;
  } else {
    // Overspent total income
    expenseScore = 0;
  }

  // 3. Budget Adherence Component (Max 30 points)
  let adherenceScore = 20; // Default neutral if no budgets set
  let budgetAdherenceRate = 100;
  let hasOverspentBudget = false;

  if (budgets.length > 0) {
    const nonOverspentCount = budgets.filter((b) => b.spentAmount <= b.budgetAmount).length;
    budgetAdherenceRate = Math.round((nonOverspentCount / budgets.length) * 100);
    adherenceScore = Math.round((budgetAdherenceRate / 100) * 30);
    hasOverspentBudget = budgets.some((b) => b.spentAmount > b.budgetAmount);
  }

  const rawTotal = savingsScore + expenseScore + adherenceScore;
  const score = Math.min(100, Math.max(0, rawTotal));

  let grade: HealthScoreGrade = 'GOOD';
  let gradeLabel = 'Tốt';

  if (score >= 85) {
    grade = 'EXCELLENT';
    gradeLabel = 'Xuất sắc';
  } else if (score >= 70) {
    grade = 'GOOD';
    gradeLabel = 'Tốt';
  } else if (score >= 50) {
    grade = 'FAIR';
    gradeLabel = 'Cần chú ý';
  } else {
    grade = 'AT_RISK';
    gradeLabel = 'Báo động';
  }

  return {
    score,
    grade,
    gradeLabel,
    savingsRate,
    expenseRatio,
    budgetAdherenceRate,
    hasOverspentBudget,
  };
}
