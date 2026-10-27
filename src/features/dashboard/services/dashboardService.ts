import 'server-only';
import { db } from '@/lib/db';
import { transactions, categories } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  getVietnamTodayString,
  getMonthDateRange,
  VIETNAM_TIMEZONE,
} from '@/lib/utils/date';
import { subtractCurrency } from '@/lib/utils/currency';
import { DashboardSummary, CategoryBreakdownItem, MonthlyTrendItem, DailyExpenseTrendItem } from '@/types';

export async function getDashboardSummary(
  userId: string,
  selectedMonth: string
): Promise<DashboardSummary> {
  const todayDate = getVietnamTodayString();
  const { startDate, endDate } = getMonthDateRange(selectedMonth);

  // Single optimized SQL query aggregating today's expense and monthly totals
  const [result] = await db
    .select({
      todayExpense: sql<string>`COALESCE(SUM(CASE 
        WHEN ${transactions.type} = 'EXPENSE' AND ${transactions.transactionDate} = ${todayDate} THEN ${transactions.amount} 
        ELSE 0 
      END), 0)::text`,

      monthlyIncome: sql<string>`COALESCE(SUM(CASE 
        WHEN ${transactions.type} = 'INCOME' AND ${transactions.transactionDate} >= ${startDate} AND ${transactions.transactionDate} <= ${endDate} THEN ${transactions.amount} 
        ELSE 0 
      END), 0)::text`,

      monthlyExpense: sql<string>`COALESCE(SUM(CASE 
        WHEN ${transactions.type} = 'EXPENSE' AND ${transactions.transactionDate} >= ${startDate} AND ${transactions.transactionDate} <= ${endDate} THEN ${transactions.amount} 
        ELSE 0 
      END), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`(
          (${transactions.transactionDate} >= ${startDate} AND ${transactions.transactionDate} <= ${endDate})
          OR (${transactions.transactionDate} = ${todayDate} AND ${transactions.type} = 'EXPENSE')
        )`
      )
    );

  const monthlyIncome = result?.monthlyIncome || '0';
  const monthlyExpense = result?.monthlyExpense || '0';
  const todayExpense = result?.todayExpense || '0';
  const remainingBalance = subtractCurrency(monthlyIncome, monthlyExpense);

  return {
    month: selectedMonth,
    todayExpense,
    monthlyIncome,
    monthlyExpense,
    remainingBalance,
    currency: 'VND',
    timezone: VIETNAM_TIMEZONE,
  };
}

export async function getCategoryExpenseBreakdown(
  userId: string,
  selectedMonth: string
): Promise<CategoryBreakdownItem[]> {
  const { startDate, endDate } = getMonthDateRange(selectedMonth);

  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      color: categories.color,
      icon: categories.icon,
      totalAmount: sql<string>`COALESCE(SUM(${transactions.amount}), 0)::text`,
      transactionCount: sql<number>`count(${transactions.id})::int`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'EXPENSE'),
        sql`${transactions.transactionDate} >= ${startDate} AND ${transactions.transactionDate} <= ${endDate}`
      )
    )
    .groupBy(categories.id, categories.name, categories.color, categories.icon)
    .orderBy(desc(sql`SUM(${transactions.amount})`));

  const totalExpense = rows.reduce((sum, row) => sum + parseFloat(row.totalAmount), 0);

  return rows.map((row) => ({
    ...row,
    percentage:
      totalExpense > 0 ? Math.round((parseFloat(row.totalAmount) / totalExpense) * 1000) / 10 : 0,
  }));
}

export async function getMonthlyTrends(
  userId: string,
  monthsCount = 6
): Promise<MonthlyTrendItem[]> {
  // Query aggregated by YYYY-MM
  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(${transactions.transactionDate}, 'YYYY-MM')`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'INCOME' THEN ${transactions.amount} ELSE 0 END), 0)::text`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'EXPENSE' THEN ${transactions.amount} ELSE 0 END), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.transactionDate} >= (CURRENT_DATE - INTERVAL '${sql.raw(
          String(monthsCount)
        )} months')`
      )
    )
    .groupBy(sql`TO_CHAR(${transactions.transactionDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${transactions.transactionDate}, 'YYYY-MM') ASC`);

  return rows;
}

/**
 * Get daily expense trend for a given month.
 * Returns one entry per day that has expenses, in ascending date order.
 */
export async function getDailyExpenseTrend(
  userId: string,
  selectedMonth: string
): Promise<DailyExpenseTrendItem[]> {
  const { startDate, endDate } = getMonthDateRange(selectedMonth);

  const rows = await db
    .select({
      date: sql<string>`${transactions.transactionDate}::text`,
      amount: sql<string>`COALESCE(SUM(${transactions.amount}), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'EXPENSE'),
        sql`${transactions.transactionDate} >= ${startDate} AND ${transactions.transactionDate} <= ${endDate}`
      )
    )
    .groupBy(transactions.transactionDate)
    .orderBy(transactions.transactionDate);

  return rows;
}
