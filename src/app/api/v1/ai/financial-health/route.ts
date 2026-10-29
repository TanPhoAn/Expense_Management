import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { getVietnamCurrentMonthString } from '@/lib/utils/date';
import { getDashboardSummary, getCategoryExpenseBreakdown } from '@/features/dashboard/services/dashboardService';
import { getUserBudgetsWithSpending } from '@/features/budgets/services/budgetService';
import { calculateFinancialHealthScore } from '@/lib/utils/financial-health';
import { generateFinancialHealthInsights } from '@/lib/ai/geminiClient';
import { FinancialHealthData, Budget, CategoryBreakdownItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || getVietnamCurrentMonthString();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return jsonError('VALIDATION_ERROR', 'Định dạng tháng phải là YYYY-MM.');
    }

    // 1. Fetch monthly financial totals, category breakdown & budgets in parallel
    const [summary, breakdown, budgetsList] = await Promise.all([
      getDashboardSummary(session.userId, month),
      getCategoryExpenseBreakdown(session.userId, month),
      getUserBudgetsWithSpending(session.userId, month),
    ]);

    const incomeNum = Number(summary.monthlyIncome) || 0;
    const expenseNum = Number(summary.monthlyExpense) || 0;

    // 2. Compute deterministic health score
    const scoreResult = calculateFinancialHealthScore({
      income: incomeNum,
      expense: expenseNum,
      budgets: (budgetsList as Budget[]).map((b: Budget) => ({
        budgetAmount: Number(b.budgetAmount) || Number(b.amount) || 0,
        spentAmount: Number(b.spentAmount) || 0,
      })),
    });

    // 3. Format top categories & overspent categories for Gemini
    const topCategories = (breakdown as CategoryBreakdownItem[]).slice(0, 3).map((c: CategoryBreakdownItem) => ({
      name: c.categoryName,
      amount: Number(c.totalAmount) || 0,
      percentage: c.percentage,
    }));

    const overspentCategories = (budgetsList as Budget[])
      .filter((b: Budget) => b.status === 'EXCEEDED')
      .map((b: Budget) => {
        const budgetVal = Number(b.budgetAmount) || Number(b.amount) || 0;
        const spentVal = Number(b.spentAmount) || 0;
        return {
          name: b.category?.name || 'Danh mục',
          overspentAmount: Math.max(0, spentVal - budgetVal),
        };
      });

    // 4. Generate AI Insights via Gemini (with deterministic fallback)
    const aiInsights = await generateFinancialHealthInsights({
      month,
      income: incomeNum,
      expense: expenseNum,
      score: scoreResult.score,
      gradeLabel: scoreResult.gradeLabel,
      topCategories,
      overspentCategories,
    });

    const responseData: FinancialHealthData = {
      score: scoreResult.score,
      grade: scoreResult.grade,
      gradeLabel: scoreResult.gradeLabel,
      metrics: {
        income: summary.monthlyIncome,
        expense: summary.monthlyExpense,
        savingsRate: scoreResult.savingsRate,
        budgetAdherenceRate: scoreResult.budgetAdherenceRate,
        hasOverspentBudget: scoreResult.hasOverspentBudget,
      },
      aiInsights,
      source: process.env.GEMINI_API_KEY ? 'ai' : 'fallback',
    };

    return jsonSuccess(responseData);
  } catch (error) {
    console.error('Financial Health API error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tính toán sức khỏe tài chính.', undefined, 500);
  }
}
