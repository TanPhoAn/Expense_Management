import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { upsertBudgetSchema } from '@/lib/validations/budget.schema';
import {
  getUserBudgetsWithSpending,
  upsertUserBudget,
} from '@/features/budgets/services/budgetService';
import { getVietnamCurrentMonthString } from '@/lib/utils/date';

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

    const budgetsList = await getUserBudgetsWithSpending(session.userId, month);
    return jsonSuccess(budgetsList);
  } catch (error) {
    console.error('Budgets GET error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể lấy dữ liệu ngân sách.', undefined, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const body = await req.json();
    const parsed = upsertBudgetSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Dữ liệu ngân sách không hợp lệ.',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const upserted = await upsertUserBudget(session.userId, parsed.data);
    return jsonSuccess(upserted, undefined, 201);
  } catch (error) {
    console.error('Budgets POST error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể lưu ngân sách.', undefined, 500);
  }
}
