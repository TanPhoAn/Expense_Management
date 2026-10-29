/**
 * PocketFlow Data Export & Financial Statement Utility
 * Standard Vietnamese Accounting CSV format (UTF-8 with BOM)
 * and Statement Calculations (KPIs, Top Outflows, Category Breakdowns).
 */

import {
  StatementSummary,
  StatementTopExpense,
  StatementCategoryBreakdown,
  StatementTransactionItem,
} from '@/types';
import { formatVND } from './currency';
import { formatVNDate, VIETNAM_TIMEZONE } from './date';

export interface RawExportTransaction {
  id: string;
  userId: string;
  categoryId?: string | null;
  description: string;
  amount: string | number;
  type: 'INCOME' | 'EXPENSE';
  transactionDate: string; // YYYY-MM-DD
  note?: string | null;
  receiptUrl?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  category?: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
    color: string;
  } | null;
}

/**
 * Escapes a single CSV value following RFC 4180.
 * If isNumeric is true, returns raw rounded integer without quotes (allowing Excel SUM formulas).
 */
export function escapeCsvField(val: string | number | null | undefined, isNumeric = false): string {
  if (val === null || val === undefined) {
    return isNumeric ? '0' : '""';
  }

  if (isNumeric) {
    const num = Math.round(Number(val));
    return isNaN(num) ? '0' : String(num);
  }

  const str = String(val);
  // Double internal quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Formats a YYYY-MM-DD date string to DD/MM/YYYY.
 */
export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

/**
 * Formats a Date or ISO string into HH:mm in Vietnam Time (UTC+7).
 */
export function formatTimeHHmm(dateVal: Date | string): string {
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return '00:00';
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '00:00';
  }
}

/**
 * Generates an accounting-compliant CSV file with UTF-8 BOM (\uFEFF)
 * for seamless compatibility with Microsoft Excel (Windows & Mac) and Google Sheets.
 */
export function generateAccountingCsv(transactions: RawExportTransaction[]): string {
  const BOM = '\uFEFF';
  const headers = [
    'Mã giao dịch',
    'Ngày giao dịch',
    'Giờ ghi nhận',
    'Loại',
    'Danh mục',
    'Số tiền (VND)',
    'Mô tả giao dịch',
    'Ghi chú',
    'Đường dẫn hóa đơn',
  ];

  const headerRow = headers.map((h) => escapeCsvField(h)).join(',');

  const dataRows = transactions.map((tx) => {
    const txId = escapeCsvField(tx.id);
    const dateFormatted = escapeCsvField(formatDateDDMMYYYY(tx.transactionDate));
    const timeFormatted = escapeCsvField(formatTimeHHmm(tx.createdAt));
    const typeLabel = escapeCsvField(tx.type === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập');
    const categoryName = escapeCsvField(tx.category?.name || 'Chưa phân loại');
    const amountVal = escapeCsvField(tx.amount, true);
    const description = escapeCsvField(tx.description);
    const note = escapeCsvField(tx.note || '');
    const receiptUrl = escapeCsvField(tx.receiptUrl || '');

    return [
      txId,
      dateFormatted,
      timeFormatted,
      typeLabel,
      categoryName,
      amountVal,
      description,
      note,
      receiptUrl,
    ].join(',');
  });

  return BOM + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Calculates number of days between two YYYY-MM-DD dates inclusive.
 */
export function countDaysBetween(startDate: string, endDate: string): number {
  try {
    const [y1, m1, d1] = startDate.split('-').map(Number);
    const [y2, m2, d2] = endDate.split('-').map(Number);
    const date1 = Date.UTC(y1, m1 - 1, d1);
    const date2 = Date.UTC(y2, m2 - 1, d2);
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  } catch {
    return 30;
  }
}

/**
 * Calculates financial statement summary metrics: Total Income, Total Expense, Net Cashflow,
 * Savings Rate %, Daily Average, Transaction Count.
 */
export function calculateStatementSummary(
  transactions: RawExportTransaction[],
  startDate: string,
  endDate: string
): StatementSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const amt = Math.round(Number(tx.amount)) || 0;
    if (tx.type === 'INCOME') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  }

  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const daysInPeriod = countDaysBetween(startDate, endDate);
  const dailyAverage = Math.round(totalExpense / daysInPeriod);

  return {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    transactionCount: transactions.length,
    dailyAverage,
    daysInPeriod,
  };
}

/**
 * Extracts top largest expenses in the period (descending by amount).
 */
export function extractTopExpenses(
  transactions: RawExportTransaction[],
  limit = 5
): StatementTopExpense[] {
  return transactions
    .filter((tx) => tx.type === 'EXPENSE')
    .map((tx) => ({
      id: tx.id,
      description: tx.description,
      categoryName: tx.category?.name || 'Khác',
      categoryColor: tx.category?.color || '#94a3b8',
      categoryIcon: tx.category?.icon || 'Tags',
      amount: Math.round(Number(tx.amount)) || 0,
      transactionDate: tx.transactionDate,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Extracts category spending breakdown (amount, percentage of total expenses, count).
 */
export function extractCategoryBreakdown(
  transactions: RawExportTransaction[]
): StatementCategoryBreakdown[] {
  const expenseTransactions = transactions.filter((tx) => tx.type === 'EXPENSE');
  const totalExpense = expenseTransactions.reduce(
    (sum, tx) => sum + (Math.round(Number(tx.amount)) || 0),
    0
  );

  const groupMap = new Map<
    string,
    {
      id: string;
      name: string;
      icon: string;
      color: string;
      amount: number;
      count: number;
    }
  >();

  for (const tx of expenseTransactions) {
    const catId = tx.category?.id || 'uncategorized';
    const catName = tx.category?.name || 'Chưa phân loại';
    const catIcon = tx.category?.icon || 'Tags';
    const catColor = tx.category?.color || '#94a3b8';
    const amt = Math.round(Number(tx.amount)) || 0;

    const existing = groupMap.get(catId);
    if (existing) {
      existing.amount += amt;
      existing.count += 1;
    } else {
      groupMap.set(catId, {
        id: catId,
        name: catName,
        icon: catIcon,
        color: catColor,
        amount: amt,
        count: 1,
      });
    }
  }

  return Array.from(groupMap.values())
    .map((item) => ({
      ...item,
      percentage: totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Formats period label (e.g. "Tháng 10/2026" or "01/10/2026 - 31/10/2026").
 */
export function formatPeriodLabel(
  startDate: string,
  endDate: string,
  month?: string
): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-');
    return `Tháng ${parseInt(m, 10)}/${y}`;
  }

  // Check if start and end cover a full calendar month
  const [startY, startM, startD] = startDate.split('-');
  const [endY, endM] = endDate.split('-');
  if (startY === endY && startM === endM && startD === '01') {
    const lastDay = new Date(parseInt(startY, 10), parseInt(startM, 10), 0).getDate();
    if (endDate.endsWith(`-${String(lastDay).padStart(2, '0')}`)) {
      return `Tháng ${parseInt(startM, 10)}/${startY}`;
    }
  }

  return `${formatDateDDMMYYYY(startDate)} — ${formatDateDDMMYYYY(endDate)}`;
}
