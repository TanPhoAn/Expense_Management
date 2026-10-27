import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { getMonthlyTrends, getDailyExpenseTrend } from '@/features/dashboard/services/dashboardService';
import { getVietnamCurrentMonthString } from '@/lib/utils/date';

/**
 * GET /api/v1/dashboard/trends
 *
 * Query params:
 *   month=YYYY-MM   — returns daily expense trend for that month (as per spec)
 *   months=N        — returns N-month aggregated income/expense trend (legacy/extra)
 *
 * If `month` is provided, daily trend is returned.
 * If only `months` is provided, monthly aggregated trend is returned.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');

    if (monthParam) {
      // Validate YYYY-MM format
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
        return jsonError(
          'VALIDATION_ERROR',
          'Tham số month phải theo định dạng YYYY-MM.',
          undefined,
          400
        );
      }
      const trend = await getDailyExpenseTrend(session.userId, monthParam);
      return jsonSuccess(trend);
    }

    // Legacy: monthly aggregated trend
    const months = parseInt(searchParams.get('months') || '6', 10);
    const safeMonths = isNaN(months) || months < 1 || months > 24 ? 6 : months;
    const trends = await getMonthlyTrends(session.userId, safeMonths);
    return jsonSuccess(trends);
  } catch (error) {
    console.error('Dashboard trends API error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tính toán xu hướng thu chi.', undefined, 500);
  }
}
