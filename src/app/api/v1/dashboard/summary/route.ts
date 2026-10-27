import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { getVietnamCurrentMonthString } from '@/lib/utils/date';
import { getDashboardSummary } from '@/features/dashboard/services/dashboardService';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || getVietnamCurrentMonthString();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return jsonError('BAD_REQUEST', 'Tháng không hợp lệ. Định dạng phải là YYYY-MM.');
    }

    const summary = await getDashboardSummary(session.userId, month);
    return jsonSuccess(summary);
  } catch (error) {
    console.error('Dashboard summary API error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tính toán thống kê tổng quan.', undefined, 500);
  }
}
