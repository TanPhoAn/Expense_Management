import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError } from '@/lib/utils/response';
import { exportTransactionsToCsv } from '@/features/transactions/services/exportTransactionsService';
import { getVietnamTodayString } from '@/lib/utils/date';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const type = searchParams.get('type') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const csvContent = await exportTransactionsToCsv(session.userId, {
      month,
      startDate,
      endDate,
      type,
      categoryId,
    });

    let filename = `pocketflow-saoke-${getVietnamTodayString()}.csv`;
    if (month) {
      filename = `pocketflow-saoke-${month}.csv`;
    } else if (startDate && endDate) {
      filename = `pocketflow-saoke-${startDate}-den-${endDate}.csv`;
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể xuất file CSV.', undefined, 500);
  }
}
