import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { deleteUserBudget } from '@/features/budgets/services/budgetService';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const budgetId = params.id;
    if (!budgetId) {
      return jsonError('VALIDATION_ERROR', 'ID ngân sách không hợp lệ.');
    }

    const success = await deleteUserBudget(session.userId, budgetId);
    if (!success) {
      return jsonError('NOT_FOUND', 'Ngân sách không tồn tại hoặc bạn không có quyền xóa.', undefined, 404);
    }

    return jsonSuccess({ message: 'Đã xóa ngân sách thành công.' });
  } catch (error) {
    console.error('Budgets DELETE error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể xóa ngân sách.', undefined, 500);
  }
}
