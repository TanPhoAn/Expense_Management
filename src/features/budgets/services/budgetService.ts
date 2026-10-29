import { db } from '@/lib/db';
import { budgets, categories, transactions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getMonthDateRange, getVietnamTodayString, getVietnamCurrentMonthString } from '@/lib/utils/date';
import { calculateBudgetStatus, calculateProjectedOverspent } from '@/lib/utils/budget';
import { Budget } from '@/types';

export async function getUserBudgetsWithSpending(
  userId: string,
  month: string
): Promise<Budget[]> {
  const { startDate, endDate } = getMonthDateRange(month);
  const currentVietnamMonth = getVietnamCurrentMonthString();
  const todayString = getVietnamTodayString();

  const totalDaysInMonth = parseInt(endDate.split('-')[2], 10);
  let currentDay = totalDaysInMonth;

  if (month === currentVietnamMonth) {
    currentDay = Math.max(1, parseInt(todayString.split('-')[2], 10));
  } else if (month > currentVietnamMonth) {
    currentDay = 1;
  }

  // 1. Fetch user's budgets for this month with category details
  const userBudgets = await db
    .select({
      id: budgets.id,
      userId: budgets.userId,
      categoryId: budgets.categoryId,
      month: budgets.month,
      amount: budgets.amount,
      createdAt: budgets.createdAt,
      updatedAt: budgets.updatedAt,
      category: {
        id: categories.id,
        userId: categories.userId,
        name: categories.name,
        type: categories.type,
        icon: categories.icon,
        color: categories.color,
        isDefault: categories.isDefault,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      },
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)));

  if (userBudgets.length === 0) {
    return [];
  }

  // 2. Fetch actual monthly expenses grouped by categoryId
  const spendingRows = await db
    .select({
      categoryId: transactions.categoryId,
      totalSpent: sql<string>`COALESCE(SUM(${transactions.amount}), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'EXPENSE'),
        sql`${transactions.transactionDate} >= ${startDate} AND ${transactions.transactionDate} <= ${endDate}`
      )
    )
    .groupBy(transactions.categoryId);

  const spendingMap = new Map<string, number>();
  for (const row of spendingRows) {
    spendingMap.set(row.categoryId, Number(row.totalSpent) || 0);
  }

  // 3. Combine budgets with spending metrics
  return userBudgets.map((b) => {
    const budgetAmountNum = Number(b.amount) || 0;
    const spentAmountNum = spendingMap.get(b.categoryId) || 0;

    const { percentage, status, remaining } = calculateBudgetStatus(spentAmountNum, budgetAmountNum);
    const projected = calculateProjectedOverspent(spentAmountNum, budgetAmountNum, currentDay, totalDaysInMonth);

    let projectedDateStr: string | undefined = undefined;
    if (projected.projectedDay) {
      projectedDateStr = `${month}-${String(projected.projectedDay).padStart(2, '0')}`;
    }

    return {
      id: b.id,
      userId: b.userId,
      categoryId: b.categoryId,
      month: b.month,
      amount: b.amount,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      category: b.category,
      budgetAmount: String(budgetAmountNum),
      spentAmount: String(spentAmountNum),
      remainingAmount: String(remaining),
      percentage,
      status,
      projectedOverspent: {
        isProjectedToOverspend: projected.isProjectedToOverspend,
        projectedDate: projectedDateStr,
        projectedMonthEndAmount: projected.projectedMonthEndAmount,
      },
    };
  });
}

export async function upsertUserBudget(
  userId: string,
  input: { categoryId: string; month: string; amount: number }
): Promise<Budget> {
  const [upserted] = await db
    .insert(budgets)
    .values({
      userId,
      categoryId: input.categoryId,
      month: input.month,
      amount: String(input.amount),
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month],
      set: {
        amount: String(input.amount),
        updatedAt: new Date(),
      },
    })
    .returning();

  return upserted as unknown as Budget;
}

export async function deleteUserBudget(userId: string, budgetId: string): Promise<boolean> {
  const [deleted] = await db
    .delete(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
    .returning({ id: budgets.id });

  return !!deleted;
}
