import { NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validations/auth.schema';
import { resetPasswordWithOtp } from '@/lib/auth/passwordResetService';
import { jsonError, jsonSuccess } from '@/lib/utils/response';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return jsonError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Dữ liệu không hợp lệ.', undefined, 400);
    }

    const { email, code, newPassword } = result.data;
    const response = await resetPasswordWithOtp(email, code, newPassword);

    return jsonSuccess({ message: response.message }, undefined, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi đặt lại mật khẩu.';
    return jsonError('BAD_REQUEST', message, undefined, 400);
  }
}
