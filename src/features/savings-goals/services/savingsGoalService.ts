import { db } from '@/lib/db';
import { savingsGoals, savingsGoalLogs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  calculateSavingsGoalProgress,
  calculateDaysLeft,
  calculateNewAmountAfterAction,
} from '@/lib/utils/savings-goal';
import { CreateSavingsGoalInput, SavingsGoalActionInput } from '@/lib/validations/savings-goal.schema';
import { SavingsGoal } from '@/types';

export async function getUserSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const rows = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, userId))
    .orderBy(savingsGoals.isCompleted, desc(savingsGoals.createdAt));

  return rows.map((goal) => {
    const target = Number(goal.targetAmount) || 0;
    const current = Number(goal.currentAmount) || 0;
    const { percentage, remaining, isCompleted } = calculateSavingsGoalProgress(current, target);
    const daysLeft = calculateDaysLeft(goal.targetDate);

    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      color: goal.color,
      icon: goal.icon,
      isCompleted: isCompleted || goal.isCompleted,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      percentage,
      remainingAmount: String(remaining),
      daysLeft,
    };
  });
}

export async function createSavingsGoal(
  userId: string,
  input: CreateSavingsGoalInput
): Promise<SavingsGoal> {
  const initial = input.initialAmount || 0;
  const isCompleted = initial >= input.targetAmount;

  const [newGoal] = await db
    .insert(savingsGoals)
    .values({
      userId,
      name: input.name,
      targetAmount: String(input.targetAmount),
      currentAmount: String(initial),
      targetDate: input.targetDate || null,
      color: input.color || '#10b981',
      icon: input.icon || 'PiggyBank',
      isCompleted,
    })
    .returning();

  // If initial balance was provided, log it
  if (initial > 0) {
    await db.insert(savingsGoalLogs).values({
      goalId: newGoal.id,
      userId,
      type: 'DEPOSIT',
      amount: String(initial),
      note: 'Số dư khởi tạo ban đầu',
    });
  }

  const { percentage, remaining } = calculateSavingsGoalProgress(initial, input.targetAmount);
  const daysLeft = calculateDaysLeft(newGoal.targetDate);

  return {
    id: newGoal.id,
    userId: newGoal.userId,
    name: newGoal.name,
    targetAmount: newGoal.targetAmount,
    currentAmount: newGoal.currentAmount,
    targetDate: newGoal.targetDate,
    color: newGoal.color,
    icon: newGoal.icon,
    isCompleted: newGoal.isCompleted,
    createdAt: newGoal.createdAt,
    updatedAt: newGoal.updatedAt,
    percentage,
    remainingAmount: String(remaining),
    daysLeft,
  };
}

export async function actionOnSavingsGoal(
  userId: string,
  goalId: string,
  action: SavingsGoalActionInput
): Promise<SavingsGoal> {
  const [goal] = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)));

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  const currentNum = Number(goal.currentAmount) || 0;
  const targetNum = Number(goal.targetAmount) || 0;

  const { newAmount, isCompleted } = calculateNewAmountAfterAction(
    currentNum,
    action.amount,
    action.type,
    targetNum
  );

  // Update goal
  const [updated] = await db
    .update(savingsGoals)
    .set({
      currentAmount: String(newAmount),
      isCompleted,
      updatedAt: new Date(),
    })
    .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)))
    .returning();

  // Record audit log
  await db.insert(savingsGoalLogs).values({
    goalId,
    userId,
    type: action.type,
    amount: String(action.amount),
    note: action.note || (action.type === 'DEPOSIT' ? 'Nạp tiền vào hũ' : 'Rút tiền từ hũ'),
  });

  const { percentage, remaining } = calculateSavingsGoalProgress(newAmount, targetNum);
  const daysLeft = calculateDaysLeft(updated.targetDate);

  return {
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    targetAmount: updated.targetAmount,
    currentAmount: updated.currentAmount,
    targetDate: updated.targetDate,
    color: updated.color,
    icon: updated.icon,
    isCompleted: updated.isCompleted,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    percentage,
    remainingAmount: String(remaining),
    daysLeft,
  };
}

export async function deleteSavingsGoal(userId: string, goalId: string): Promise<boolean> {
  const [deleted] = await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)))
    .returning({ id: savingsGoals.id });

  return !!deleted;
}
