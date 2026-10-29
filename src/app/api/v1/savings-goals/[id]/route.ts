import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { deleteSavingsGoal } from '@/features/savings-goals/services/savingsGoalService';

export async function DELETE(
  _req: NextRequest,
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

    const success = await deleteSavingsGoal(session.userId, goalId);
    if (!success) {
      return jsonError('NOT_FOUND', 'Mục tiêu không tồn tại hoặc bạn không có quyền xóa.', undefined, 404);
    }

    return jsonSuccess({ message: 'Đã xóa mục tiêu tiết kiệm thành công.' });
  } catch (error) {
    console.error('Savings Goal DELETE error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể xóa mục tiêu tiết kiệm.', undefined, 500);
  }
}
