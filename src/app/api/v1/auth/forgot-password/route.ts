import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validations/auth.schema';
import { requestPasswordReset } from '@/lib/auth/passwordResetService';
import { jsonError, jsonSuccess } from '@/lib/utils/response';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return jsonError('VALIDATION_ERROR', result.error.errors[0]?.message || 'Email không hợp lệ.', undefined, 400);
    }

    const { email } = result.data;
    const response = await requestPasswordReset(email);

    return jsonSuccess({ message: response.message }, undefined, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý yêu cầu.';
    return jsonError('BAD_REQUEST', message, undefined, 400);
  }
}
