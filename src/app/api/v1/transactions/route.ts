import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import {
  createTransactionSchema,
  transactionFilterSchema,
} from '@/lib/validations/transaction.schema';
import {
  listUserTransactions,
  createTransaction,
} from '@/features/transactions/services/transactionsService';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const filterInput = {
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      type: searchParams.get('type') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const parsedFilter = transactionFilterSchema.safeParse(filterInput);
    if (!parsedFilter.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Bộ lọc không hợp lệ',
        parsedFilter.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const result = await listUserTransactions(session.userId, parsedFilter.data);
    return jsonSuccess(result.records, result.meta);
  } catch (error) {
    console.error('Transactions GET error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể lấy danh sách giao dịch.', undefined, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const body = await req.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Dữ liệu giao dịch không hợp lệ',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const newTransaction = await createTransaction(session.userId, parsed.data);
    return jsonSuccess(newTransaction, undefined, 201);
  } catch (error: any) {
    if (error?.message === 'CATEGORY_NOT_FOUND') {
      return jsonError('NOT_FOUND', 'Danh mục được chọn không tồn tại.', undefined, 404);
    }
    if (error?.message === 'CATEGORY_TYPE_MISMATCH') {
      return jsonError('BAD_REQUEST', 'Loại danh mục không khớp với loại giao dịch (INCOME/EXPENSE).', undefined, 400);
    }
    console.error('Transactions POST error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tạo giao dịch.', undefined, 500);
  }
}
