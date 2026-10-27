import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { getCategoryExpenseBreakdown } from '@/features/dashboard/services/dashboardService';
import { getVietnamCurrentMonthString } from '@/lib/utils/date';

/**
 * GET /api/v1/dashboard/expense-breakdown?month=YYYY-MM
 *
 * Returns expense breakdown by category for the given month.
 * Defaults to the current Vietnam calendar month if month param is omitted.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month') || getVietnamCurrentMonthString();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
      return jsonError(
        'VALIDATION_ERROR',
        'Tham số month phải theo định dạng YYYY-MM.',
        undefined,
        400
      );
    }

    const breakdown = await getCategoryExpenseBreakdown(session.userId, monthParam);
    return jsonSuccess(breakdown);
  } catch (error) {
    console.error('Dashboard expense-breakdown API error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tính toán phân loại chi tiêu.', undefined, 500);
  }
}
