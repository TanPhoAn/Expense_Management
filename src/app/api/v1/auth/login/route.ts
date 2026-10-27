import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { loginSchema } from '@/lib/validations/auth.schema';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Email hoặc mật khẩu không hợp lệ',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { email, password } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return jsonError('UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác.', undefined, 401);
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return jsonError('UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác.', undefined, 401);
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const res = jsonSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });

    return res;
  } catch (error) {
    console.error('Login API error:', error);
    return jsonError('INTERNAL_ERROR', 'Đã xảy ra lỗi khi đăng nhập.', undefined, 500);
  }
}
