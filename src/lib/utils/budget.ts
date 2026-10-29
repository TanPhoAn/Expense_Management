import { BudgetStatus } from '@/types';

export interface BudgetStatusResult {
  percentage: number;
  status: BudgetStatus;
  remaining: number;
}

export interface ProjectedOverspentResult {
  isProjectedToOverspend: boolean;
  projectedDay?: number;
  projectedMonthEndAmount?: string;
}

/**
 * Calculates budget percentage, status and remaining amount.
 * Capped percentage is NOT used so we know if it's over 100%.
 */
export function calculateBudgetStatus(spent: number, budget: number): BudgetStatusResult {
  if (budget <= 0) {
    return {
      percentage: 0,
      status: 'SAFE',
      remaining: 0,
    };
  }

  const rawPercentage = (spent / budget) * 100;
  const percentage = Math.round(rawPercentage * 10) / 10;
  const remaining = budget - spent;

  let status: BudgetStatus = 'SAFE';
  if (percentage >= 100) {
    status = 'EXCEEDED';
  } else if (percentage >= 70) {
    status = 'WARNING';
  }

  return {
    percentage,
    status,
    remaining,
  };
}

/**
 * Projects whether spending rate will exceed budget by the end of the month.
 */
export function calculateProjectedOverspent(
  spent: number,
  budget: number,
  currentDay: number,
  totalDaysInMonth: number
): ProjectedOverspentResult {
  if (budget <= 0 || spent <= 0 || currentDay <= 0 || totalDaysInMonth <= 0) {
    return { isProjectedToOverspend: false };
  }

  // Already exceeded
  if (spent >= budget) {
    return {
      isProjectedToOverspend: true,
      projectedDay: currentDay,
      projectedMonthEndAmount: String(Math.round(spent)),
    };
  }

  const dailyBurnRate = spent / currentDay;
  const projectedMonthEnd = dailyBurnRate * totalDaysInMonth;

  if (projectedMonthEnd > budget) {
    const projectedDay = Math.min(totalDaysInMonth, Math.max(1, Math.ceil(budget / dailyBurnRate)));
    return {
      isProjectedToOverspend: true,
      projectedDay,
      projectedMonthEndAmount: String(Math.round(projectedMonthEnd)),
    };
  }

  return {
    isProjectedToOverspend: false,
  };
}
