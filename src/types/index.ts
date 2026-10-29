export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  description: string;
  amount: string; // Exact numeric representation (VND)
  type: TransactionType;
  transactionDate: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh
  note?: string | null;
  receiptUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

export interface DashboardSummary {
  month: string; // YYYY-MM
  todayExpense: string; // VND string
  monthlyIncome: string; // VND string
  monthlyExpense: string; // VND string
  remainingBalance: string; // VND string (can be negative)
  currency: 'VND';
  timezone: 'Asia/Ho_Chi_Minh';
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  totalAmount: string; // VND string
  transactionCount: number;
  percentage: number; // 0 - 100
}

export interface MonthlyTrendItem {
  month: string; // YYYY-MM
  income: string; // VND string
  expense: string; // VND string
}

export interface DailyExpenseTrendItem {
  date: string; // YYYY-MM-DD
  amount: string; // VND string
}

export interface GoldPriceData {
  name: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  updatedAt: string;
  source: string;
}

export interface FuelPriceData {
  fuelName: string;
  priceZone1: number;
  priceZone2?: number;
  ron95V?: {
    name: string;
    priceZone1: number;
    priceZone2: number;
  };
  effectiveDate: string;
  trend: 'UP' | 'DOWN' | 'UNCHANGED';
  changeAmount?: number;
  source: string;
  regionNote?: string;
}

export interface MarketPricesData {
  gold: GoldPriceData;
  fuel: FuelPriceData;
  cachedAt: string;
  isStale: boolean;
}

export type BudgetStatus = 'SAFE' | 'WARNING' | 'EXCEEDED';

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: string; // YYYY-MM
  amount: string; // VND string
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
  // Computed fields
  budgetAmount?: string;
  spentAmount?: string;
  remainingAmount?: string;
  percentage?: number;
  status?: BudgetStatus;
  projectedOverspent?: {
    isProjectedToOverspend: boolean;
    projectedDate?: string;
    projectedMonthEndAmount?: string;
  };
}

export type HealthScoreGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'AT_RISK';

export interface FinancialHealthData {
  score: number; // 0 - 100
  grade: HealthScoreGrade;
  gradeLabel: string;
  metrics: {
    income: string;
    expense: string;
    savingsRate: number; // percentage
    budgetAdherenceRate: number; // percentage
    hasOverspentBudget: boolean;
  };
  aiInsights: {
    highlight: string;
    warning: string;
    recommendation: string;
  };
  source: 'ai' | 'fallback';
}

