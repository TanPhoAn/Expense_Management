import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { savingsGoalActionSchema } from '@/lib/validations/savings-goal.schema';
import { actionOnSavingsGoal } from '@/features/savings-goals/services/savingsGoalService';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const goalId = params.id;
    if (!goalId) {
      return jsonError('VALIDATION_ERROR', 'ID mục tiêu tiết kiệm không hợp lệ.');
    }

    const body = await req.json();
    const parsed = savingsGoalActionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Dữ liệu thao tác không hợp lệ.',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const updatedGoal = await actionOnSavingsGoal(session.userId, goalId, parsed.data);
    return jsonSuccess(updatedGoal);
  } catch (error: any) {
    if (error?.message === 'GOAL_NOT_FOUND') {
      return jsonError('NOT_FOUND', 'Mục tiêu không tồn tại hoặc bạn không có quyền truy cập.', undefined, 404);
    }
    if (error?.message === 'INSUFFICIENT_FUNDS') {
      return jsonError('BAD_REQUEST', 'Số tiền rút vượt quá số dư hiện có trong hũ!');
    }
    console.error('Savings Goal Action error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể thực hiện thao tác nạp/rút tiền.', undefined, 500);
  }
}
