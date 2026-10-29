/**
 * PocketFlow Dashboard UI & UX Helpers
 * Anchored to Vietnam Timezone ('Asia/Ho_Chi_Minh')
 */

import { getVietnamCurrentMonthString } from "@/lib/utils/date";

/**
 * Calculates adjacent month string in 'YYYY-MM' format.
 * delta = -1 (previous month) or 1 (next month)
 * Handles year roll-overs: '2026-01' with -1 -> '2025-12', '2026-12' with +1 -> '2027-01'
 */
export function getAdjacentMonthString(monthString: string, delta: -1 | 1): string {
  if (!monthString || !/^\d{4}-\d{2}$/.test(monthString)) {
    return getVietnamCurrentMonthString();
  }

  const [yearStr, monthStr] = monthString.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + delta;

  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Formats YYYY-MM into friendly Vietnamese text (e.g. "2026-10" -> "Tháng 10, 2026")
 */
export function formatVNMonthYear(monthString: string): string {
  if (!monthString) return "";
  const [yearStr, monthStr] = monthString.split("-");
  const month = parseInt(monthStr, 10);
  if (isNaN(month) || !yearStr) return monthString;
  return `Tháng ${month}, ${yearStr}`;
}

/**
 * Checks whether a given YYYY-MM matches the current active month in Vietnam.
 */
export function isCurrentVietnamMonth(monthString: string): boolean {
  return monthString === getVietnamCurrentMonthString();
}

/**
 * Masks a monetary amount if privacy mode is enabled.
 * Example: maskCurrency("1.500.000 ₫", true) -> "•••••••• ₫"
 */
export function maskCurrency(amountStr: string, isMasked: boolean): string {
  if (!isMasked) return amountStr;
  return "•••••••• ₫";
}

/**
 * Calculates burn rate percentage (Expense / Income * 100).
 * Returns rounded integer percentage (e.g. 45 -> 45%). Returns 0 if income is 0.
 */
export function calculateBurnRate(
  monthlyExpense: string | number,
  monthlyIncome: string | number
): number {
  const expense = typeof monthlyExpense === "number" ? monthlyExpense : parseFloat(monthlyExpense || "0");
  const income = typeof monthlyIncome === "number" ? monthlyIncome : parseFloat(monthlyIncome || "0");

  if (income <= 0 || isNaN(income) || isNaN(expense) || expense <= 0) {
    return 0;
  }

  return Math.min(999, Math.round((expense / income) * 100));
}

/**
 * Calculates daily average expense for a given month.
 * Days in month defaults to actual calendar days.
 */
export function calculateDailyAverage(
  monthlyExpense: string | number,
  daysInMonth: number
): number {
  const expense = typeof monthlyExpense === "number" ? monthlyExpense : parseFloat(monthlyExpense || "0");
  if (expense <= 0 || daysInMonth <= 0 || isNaN(expense) || isNaN(daysInMonth)) {
    return 0;
  }
  return Math.round(expense / daysInMonth);
}
