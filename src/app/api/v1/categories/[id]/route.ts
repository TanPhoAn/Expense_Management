import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { updateCategorySchema } from '@/lib/validations/category.schema';
import {
  updateCustomCategory,
  deleteCustomCategory,
} from '@/features/categories/services/categoriesService';

async function handleUpdate(req: NextRequest, categoryId: string) {
  const session = await getCurrentUser();
  if (!session) {
    return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
  }

  const body = await req.json();
  const parsed = updateCategorySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      'Dữ liệu danh mục không hợp lệ',
      parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    );
  }

  try {
    const updated = await updateCustomCategory(session.userId, categoryId, parsed.data);
    return jsonSuccess(updated);
  } catch (error: any) {
    if (error?.message === 'CATEGORY_NOT_FOUND_OR_FORBIDDEN') {
      return jsonError(
        'FORBIDDEN',
        'Không thể chỉnh sửa danh mục mặc định của hệ thống hoặc danh mục không tồn tại.',
        undefined,
        403
      );
    }
    console.error('Category update error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể cập nhật danh mục.', undefined, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(req, params.id);
}

/** PATCH is an alias of PUT for partial updates — same Zod schema (all fields optional). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(req, params.id);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    await deleteCustomCategory(session.userId, params.id);
    return jsonSuccess({ message: 'Đã xóa danh mục thành công.' });
  } catch (error: any) {
    if (error?.message === 'CATEGORY_NOT_FOUND') {
      return jsonError('NOT_FOUND', 'Danh mục không tồn tại.', undefined, 404);
    }
    if (error?.message === 'FORBIDDEN_SYSTEM_CATEGORY') {
      return jsonError(
        'FORBIDDEN',
        'Không thể xóa danh mục mặc định của hệ thống.',
        undefined,
        403
      );
    }
    if (error?.message === 'CATEGORY_IN_USE') {
      return jsonError(
        'CONFLICT',
        'Không thể xóa danh mục đã có giao dịch liên kết. Hãy chuyển đổi giao dịch trước.',
        undefined,
        409
      );
    }
    console.error('Category DELETE error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể xóa danh mục.', undefined, 500);
  }
}

