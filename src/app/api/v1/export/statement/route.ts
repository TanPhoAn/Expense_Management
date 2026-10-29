import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { generateStatementData } from '@/features/transactions/services/exportTransactionsService';

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

    const statementData = await generateStatementData(session.userId, {
      month,
      startDate,
      endDate,
    });

    return jsonSuccess(statementData);
  } catch (error) {
    console.error('Export statement error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tạo dữ liệu sao kê.', undefined, 500);
  }
}
