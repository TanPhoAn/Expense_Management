import 'server-only';
import { db } from '@/lib/db';
import { categories, transactions } from '@/lib/db/schema';
import { eq, or, and, sql } from 'drizzle-orm';
import { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validations/category.schema';

export async function getCategoriesForUser(userId: string) {
  return db
    .select()
    .from(categories)
    .where(or(eq(categories.userId, userId), sql`${categories.userId} IS NULL`))
    .orderBy(categories.type, categories.name);
}

export async function createCustomCategory(userId: string, input: CreateCategoryInput) {
  // Check for duplicate custom category with same name (case-insensitive) and type for this user
  const existing = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.type, input.type),
        sql`lower(${categories.name}) = lower(${input.name.trim()})`
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('DUPLICATE_CATEGORY_NAME');
  }

  const [created] = await db
    .insert(categories)
    .values({
      userId,
      name: input.name.trim(),
      type: input.type,
      icon: input.icon,
      color: input.color,
      isDefault: false,
    })
    .returning();

  return created;
}

export async function updateCustomCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput
) {
  // Verify ownership (cannot edit system defaults)
  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new Error('CATEGORY_NOT_FOUND_OR_FORBIDDEN');
  }

  const [updated] = await db
    .update(categories)
    .set({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.color ? { color: input.color } : {}),
      updatedAt: new Date(),
    })
    .where(eq(categories.id, categoryId))
    .returning();

  return updated;
}

export async function deleteCustomCategory(userId: string, categoryId: string) {
  // Check if system default or owned
  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (!existing) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  if (!existing.userId || existing.userId !== userId) {
    throw new Error('FORBIDDEN_SYSTEM_CATEGORY');
  }

  // Check if any transactions reference this category
  const [inUse] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId));

  if (inUse && Number(inUse.count) > 0) {
    throw new Error('CATEGORY_IN_USE');
  }

  await db.delete(categories).where(eq(categories.id, categoryId));
  return true;
}
