import { NextResponse } from 'next/server';
import { changePasswordSchema } from '@/lib/validations/auth.schema';
import { changeUserPassword } from '@/lib/auth/passwordResetService';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return jsonError('UNAUTHORIZED', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.', undefined, 401);
    }

    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return jsonError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Dữ liệu không hợp lệ.', undefined, 400);
    }

    const { currentPassword, newPassword } = result.data;
    const response = await changeUserPassword(sessionUser.userId, currentPassword, newPassword);

    return jsonSuccess({ message: response.message }, undefined, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi đổi mật khẩu.';
    return jsonError('BAD_REQUEST', message, undefined, 400);
  }
}
