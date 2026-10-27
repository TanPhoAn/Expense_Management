import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/utils/response';
import { suggestCategoryFromDescription } from '@/features/categories/services/suggestionService';
import { getCategoriesForUser } from '@/features/categories/services/categoriesService';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError('UNAUTHORIZED', 'Chưa đăng nhập.', undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return jsonSuccess({ suggestion: null });
    }

    const suggestion = suggestCategoryFromDescription(query);
    if (!suggestion) {
      return jsonSuccess({ suggestion: null });
    }

    // Resolve matching category ID from user's available categories
    const userCategories = await getCategoriesForUser(session.userId);
    const matchedCategory = userCategories.find(
      (c) =>
        c.type === suggestion.type &&
        c.name.toLowerCase() === suggestion.categoryName.toLowerCase()
    );

    return jsonSuccess({
      suggestion: matchedCategory
        ? {
            category: matchedCategory,
            confidence: suggestion.confidence,
          }
        : null,
    });
  } catch (error) {
    console.error('Suggest API error:', error);
    return jsonError('INTERNAL_ERROR', 'Không thể gợi ý danh mục.', undefined, 500);
  }
}
