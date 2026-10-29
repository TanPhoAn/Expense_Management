import 'server-only';
import { db } from '@/lib/db';
import { transactions, categories, users } from '@/lib/db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import {
  RawExportTransaction,
  generateAccountingCsv,
  calculateStatementSummary,
  extractTopExpenses,
  extractCategoryBreakdown,
  formatPeriodLabel,
  formatDateDDMMYYYY,
  formatTimeHHmm,
} from '@/lib/utils/export';
import { getMonthDateRange, getVietnamTodayString } from '@/lib/utils/date';
import { StatementData } from '@/types';

export interface ExportFilterOptions {
  month?: string;
  startDate?: string;
  endDate?: string;
  type?: string; // 'ALL' | 'EXPENSE' | 'INCOME'
  categoryId?: string;
}

/**
 * Fetch all matching transactions for a user (unpaginated, up to 10,000).
 */
export async function getTransactionsForExport(
  userId: string,
  options: ExportFilterOptions = {}
): Promise<RawExportTransaction[]> {
  let { startDate, endDate } = options;

  if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
    const range = getMonthDateRange(options.month);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  const conditions = [eq(transactions.userId, userId)];

  if (startDate) {
    conditions.push(gte(transactions.transactionDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(transactions.transactionDate, endDate));
  }
  if (options.type && options.type !== 'ALL') {
    conditions.push(eq(transactions.type, options.type as 'INCOME' | 'EXPENSE'));
  }
  if (options.categoryId && options.categoryId !== 'ALL') {
    conditions.push(eq(transactions.categoryId, options.categoryId));
  }

  const records = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      categoryId: transactions.categoryId,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      transactionDate: transactions.transactionDate,
      note: transactions.note,
      receiptUrl: transactions.receiptUrl,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        type: categories.type,
        icon: categories.icon,
        color: categories.color,
      },
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(10000);

  return records;
}

/**
 * Generates an accounting CSV string for the given user and filter options.
 */
export async function exportTransactionsToCsv(
  userId: string,
  options: ExportFilterOptions = {}
): Promise<string> {
  const records = await getTransactionsForExport(userId, options);
  return generateAccountingCsv(records);
}

/**
 * Generates complete financial statement payload for PDF Infographic & live preview.
 */
export async function generateStatementData(
  userId: string,
  options: ExportFilterOptions = {}
): Promise<StatementData> {
  // 1. Fetch user information
  const [userRecord] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userName = userRecord?.name || userRecord?.email?.split('@')[0] || 'Chủ tài khoản PocketFlow';
  const userEmail = userRecord?.email || '';
  const joinedDate = userRecord?.createdAt
    ? formatDateDDMMYYYY(userRecord.createdAt.toISOString().split('T')[0])
    : '2026';

  // 2. Resolve dates
  let startDate = options.startDate;
  let endDate = options.endDate;

  if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
    const range = getMonthDateRange(options.month);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  if (!startDate || !endDate) {
    const currentMonth = getVietnamTodayString().substring(0, 7);
    const range = getMonthDateRange(currentMonth);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  const periodLabel = formatPeriodLabel(startDate, endDate, options.month);

  // 3. Fetch all transactions in period
  const allTransactions = await getTransactionsForExport(userId, {
    startDate,
    endDate,
    type: 'ALL',
    categoryId: 'ALL',
  });

  // 4. Compute metrics
  const summary = calculateStatementSummary(allTransactions, startDate, endDate);
  const topExpenses = extractTopExpenses(allTransactions, 5);
  const categoryBreakdown = extractCategoryBreakdown(allTransactions);

  // 5. Format transactions list for statement ledger
  const formattedTransactions = allTransactions.map((tx) => ({
    id: tx.id,
    transactionDate: tx.transactionDate,
    time: formatTimeHHmm(tx.createdAt),
    type: tx.type,
    categoryName: tx.category?.name || 'Chưa phân loại',
    categoryColor: tx.category?.color || '#94a3b8',
    categoryIcon: tx.category?.icon || 'Tags',
    amount: Math.round(Number(tx.amount)) || 0,
    description: tx.description,
    note: tx.note,
    receiptUrl: tx.receiptUrl,
  }));

  // 6. Generate statement ID and security verification mark
  const generatedAt = new Date().toISOString();
  const statementId = `PF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const hashInput = `${userId}:${statementId}:${startDate}:${endDate}:${summary.totalExpense}:${summary.totalIncome}`;
  const securityHash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 24).toUpperCase();

  return {
    user: {
      name: userName,
      email: userEmail,
      joinedDate,
    },
    period: {
      startDate,
      endDate,
      label: periodLabel,
    },
    summary,
    topExpenses,
    categoryBreakdown,
    transactions: formattedTransactions,
    metadata: {
      generatedAt,
      statementId,
      securityHash,
    },
  };
}
