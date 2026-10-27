import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return jsonError('NOT_FOUND', 'Người dùng không tồn tại.', undefined, 404);
  }

  return jsonSuccess({ user });
}
