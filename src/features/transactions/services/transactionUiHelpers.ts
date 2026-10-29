import { Transaction } from "@/types";
import {
  getVietnamTodayString,
  getVietnamCurrentMonthString,
  getMonthDateRange,
} from "@/lib/utils/date";

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
}

/**
 * Calculates real-time financial metrics from a list of transactions.
 */
export function calculateTransactionsSummary(transactions: Transaction[]): TransactionSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "INCOME") {
      totalIncome += amount;
      incomeCount += 1;
    } else {
      totalExpense += amount;
      expenseCount += 1;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netFlow: totalIncome - totalExpense,
    incomeCount,
    expenseCount,
    totalCount: transactions.length,
  };
}

export type QuickDatePreset = "all" | "today" | "week" | "month";

/**
 * Computes start and end date in YYYY-MM-DD for standard financial presets (Asia/Ho_Chi_Minh).
 */
export function getQuickDateRange(preset: QuickDatePreset): { startDate: string; endDate: string } {
  const today = getVietnamTodayString();

  if (preset === "all") {
    return { startDate: "", endDate: "" };
  }

  if (preset === "today") {
    return { startDate: today, endDate: today };
  }

  if (preset === "month") {
    const currentMonth = getVietnamCurrentMonthString();
    return getMonthDateRange(currentMonth);
  }

  if (preset === "week") {
    // Current Monday to Sunday
    const [year, month, day] = today.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const pad = (n: number) => String(n).padStart(2, "0");
    const startDate = `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
    const endDate = `${sunday.getUTCFullYear()}-${pad(sunday.getUTCMonth() + 1)}-${pad(sunday.getUTCDate())}`;

    return { startDate, endDate };
  }

  return { startDate: "", endDate: "" };
}

/**
 * Checks which preset matches the given start and end date (if any).
 */
export function matchDatePreset(startDate: string, endDate: string): QuickDatePreset | "custom" {
  if (!startDate && !endDate) return "all";

  const today = getQuickDateRange("today");
  if (startDate === today.startDate && endDate === today.endDate) return "today";

  const week = getQuickDateRange("week");
  if (startDate === week.startDate && endDate === week.endDate) return "week";

  const month = getQuickDateRange("month");
  if (startDate === month.startDate && endDate === month.endDate) return "month";

  return "custom";
}
