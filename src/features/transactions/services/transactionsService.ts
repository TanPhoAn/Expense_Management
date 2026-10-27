import 'server-only';
import { db } from '@/lib/db';
import { transactions, categories } from '@/lib/db/schema';
import { eq, and, desc, sql, gte, lte, ilike } from 'drizzle-orm';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilterInput,
} from '@/lib/validations/transaction.schema';

export async function listUserTransactions(userId: string, filter: TransactionFilterInput) {
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(transactions.userId, userId)];

  if (filter.type) {
    conditions.push(eq(transactions.type, filter.type));
  }
  if (filter.categoryId) {
    conditions.push(eq(transactions.categoryId, filter.categoryId));
  }
  if (filter.startDate) {
    conditions.push(gte(transactions.transactionDate, filter.startDate));
  }
  if (filter.endDate) {
    conditions.push(lte(transactions.transactionDate, filter.endDate));
  }
  if (filter.search && filter.search.trim().length > 0) {
    conditions.push(ilike(transactions.description, `%${filter.search.trim()}%`));
  }

  const whereClause = and(...conditions);

  // Total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(whereClause);

  const totalCount = Number(count);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Records with joined category
  const records = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      categoryId: transactions.categoryId,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      transactionDate: transactions.transactionDate,
      note: transactions.note,
      receiptUrl: transactions.receiptUrl,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        type: categories.type,
        icon: categories.icon,
        color: categories.color,
      },
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(whereClause)
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    records,
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}

export async function getTransactionById(userId: string, transactionId: string) {
  const [record] = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      categoryId: transactions.categoryId,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      transactionDate: transactions.transactionDate,
      note: transactions.note,
      receiptUrl: transactions.receiptUrl,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        type: categories.type,
        icon: categories.icon,
        color: categories.color,
      },
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1);

  return record || null;
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  // Validate that the category exists and either belongs to user or is system default
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, input.categoryId),
        sql`(${categories.userId} = ${userId} OR ${categories.userId} IS NULL)`
      )
    )
    .limit(1);

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  // Financial Business Rule: Category type must match transaction type
  if (category.type !== input.type) {
    throw new Error('CATEGORY_TYPE_MISMATCH');
  }

  const [created] = await db
    .insert(transactions)
    .values({
      userId,
      categoryId: input.categoryId,
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      transactionDate: input.transactionDate,
      note: input.note ? input.note.trim() : null,
      receiptUrl: input.receiptUrl ? input.receiptUrl.trim() : null,
    })
    .returning();

  return created;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput
) {
  const existing = await getTransactionById(userId, transactionId);
  if (!existing) {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  const targetCategoryId = input.categoryId || existing.categoryId;
  const targetType = input.type || existing.type;

  // Validate category if category or type changed
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, targetCategoryId),
        sql`(${categories.userId} = ${userId} OR ${categories.userId} IS NULL)`
      )
    )
    .limit(1);

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  if (category.type !== targetType) {
    throw new Error('CATEGORY_TYPE_MISMATCH');
  }

  const [updated] = await db
    .update(transactions)
    .set({
      ...(input.description ? { description: input.description.trim() } : {}),
      ...(input.amount ? { amount: input.amount } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.transactionDate ? { transactionDate: input.transactionDate } : {}),
      ...(input.note !== undefined ? { note: input.note ? input.note.trim() : null } : {}),
      ...(input.receiptUrl !== undefined ? { receiptUrl: input.receiptUrl ? input.receiptUrl.trim() : null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .returning();

  return updated;
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  return true;
}
