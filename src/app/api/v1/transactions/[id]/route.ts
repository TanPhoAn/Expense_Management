import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { updateTransactionSchema } from '@/lib/validations/transaction.schema';
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '@/features/transactions/services/transactionsService';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const transaction = await getTransactionById(session.userId, params.id);
    if (!transaction) {
      return jsonError('NOT_FOUND', 'Giao dịch không tồn tại.', undefined, 404);
    }

    return jsonSuccess(transaction);
  } catch (error) {
    console.error('Transaction GET error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể lấy thông tin giao dịch.', undefined, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const body = await req.json();
    const parsed = updateTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Dữ liệu giao dịch không hợp lệ',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const updated = await updateTransaction(session.userId, params.id, parsed.data);
    return jsonSuccess(updated);
  } catch (error: any) {
    if (error?.message === 'TRANSACTION_NOT_FOUND') {
      return jsonError('NOT_FOUND', 'Giao dịch không tồn tại.', undefined, 404);
    }
    if (error?.message === 'CATEGORY_NOT_FOUND') {
      return jsonError('NOT_FOUND', 'Danh mục không tồn tại.', undefined, 404);
    }
    if (error?.message === 'CATEGORY_TYPE_MISMATCH') {
      return jsonError('BAD_REQUEST', 'Loại danh mục không khớp với loại giao dịch.', undefined, 400);
    }
    console.error('Transaction PUT error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể cập nhật giao dịch.', undefined, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    await deleteTransaction(session.userId, params.id);
    return jsonSuccess({ message: 'Đã xóa giao dịch thành công.' });
  } catch (error: any) {
    if (error?.message === 'TRANSACTION_NOT_FOUND') {
      return jsonError('NOT_FOUND', 'Giao dịch không tồn tại.', undefined, 404);
    }
    console.error('Transaction DELETE error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể xóa giao dịch.', undefined, 500);
  }
}
