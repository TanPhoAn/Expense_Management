import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { createCategorySchema } from '@/lib/validations/category.schema';
import {
  getCategoriesForUser,
  createCustomCategory,
} from '@/features/categories/services/categoriesService';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const categoriesList = await getCategoriesForUser(session.userId);
    return jsonSuccess(categoriesList);
  } catch (error) {
    console.error('Categories GET error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể lấy danh sách danh mục.', undefined, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        'Dữ liệu danh mục không hợp lệ',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const newCategory = await createCustomCategory(session.userId, parsed.data);
    return jsonSuccess(newCategory, undefined, 201);
  } catch (error: any) {
    if (error?.message === 'DUPLICATE_CATEGORY_NAME') {
      return jsonError('CONFLICT', 'Bạn đã có danh mục cùng tên và loại giao dịch này.');
    }
    console.error('Categories POST error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể tạo danh mục.', undefined, 500);
  }
}
