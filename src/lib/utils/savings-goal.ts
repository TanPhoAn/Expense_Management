import { getVietnamTodayString } from './date';

export interface SavingsProgressResult {
  percentage: number;
  remaining: number;
  isCompleted: boolean;
}

/**
 * Calculates percentage completion, remaining amount, and completion status.
 */
export function calculateSavingsGoalProgress(
  currentAmount: number,
  targetAmount: number
): SavingsProgressResult {
  if (targetAmount <= 0) {
    return {
      percentage: 0,
      remaining: 0,
      isCompleted: false,
    };
  }

  const rawPercentage = (currentAmount / targetAmount) * 100;
  const percentage = Math.round(rawPercentage * 10) / 10;
  const remaining = Math.max(0, targetAmount - currentAmount);
  const isCompleted = currentAmount >= targetAmount;

  return {
    percentage,
    remaining,
    isCompleted,
  };
}

/**
 * Calculates remaining days until target date relative to Vietnam today.
 */
export function calculateDaysLeft(targetDate?: string | null): number | null {
  if (!targetDate) return null;

  const todayStr = getVietnamTodayString();
  const today = new Date(todayStr);
  const target = new Date(targetDate);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Computes new balance and completion status after a deposit or withdrawal.
 */
export function calculateNewAmountAfterAction(
  currentAmount: number,
  amount: number,
  type: 'DEPOSIT' | 'WITHDRAW',
  targetAmount: number
): { newAmount: number; isCompleted: boolean } {
  if (amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }

  if (type === 'WITHDRAW') {
    if (amount > currentAmount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }
    const newAmount = currentAmount - amount;
    return {
      newAmount,
      isCompleted: newAmount >= targetAmount,
    };
  }

  // DEPOSIT
  const newAmount = currentAmount + amount;
  return {
    newAmount,
    isCompleted: newAmount >= targetAmount,
  };
}
