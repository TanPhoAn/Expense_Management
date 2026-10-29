import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { createSavingsGoalSchema } from '@/lib/validations/savings-goal.schema';
import {
  getUserSavingsGoals,
  createSavingsGoal,
} from '@/features/savings-goals/services/savingsGoalService';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const goals = await getUserSavingsGoals(session.userId);
    return jsonSuccess(goals);
  } catch (error) {
    console.error('Savings Goals GET error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể lấy danh sách mục tiêu tiết kiệm.', undefined, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const body = await req.json();
    const parsed = createSavingsGoalSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Dữ liệu mục tiêu tiết kiệm không hợp lệ.',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const newGoal = await createSavingsGoal(session.userId, parsed.data);
    return jsonSuccess(newGoal, undefined, 201);
  } catch (error) {
    console.error('Savings Goals POST error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tạo mục tiêu tiết kiệm.', undefined, 500);
  }
}
