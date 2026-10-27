import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { registerSchema } from '@/lib/validations/auth.schema';
import { hashPassword } from '@/lib/auth/password';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Dữ liệu đăng ký không hợp lệ',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { name, email, password } = parsed.data;

    // Check if email already registered
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return jsonError('CONFLICT', 'Email này đã được sử dụng. Vui lòng đăng nhập.');
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
      })
      .returning();

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    const res = jsonSuccess(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      undefined,
      201
    );

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });

    return res;
  } catch (error) {
    console.error('Register API error:', error);
    return jsonError('INTERNAL_ERROR', 'Đã xảy ra lỗi khi tạo tài khoản.', undefined, 500);
  }
}
