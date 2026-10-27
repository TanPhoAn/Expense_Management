import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { jsonSuccess } from '@/lib/utils/response';

export async function POST() {
  const res = jsonSuccess({ message: 'Đăng xuất thành công' });
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
