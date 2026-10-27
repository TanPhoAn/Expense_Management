import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  check,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------
export const transactionTypeEnum = pgEnum('transaction_type', ['INCOME', 'EXPENSE']);

// -----------------------------------------------------------------------------
// Users Table
// -----------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  image: varchar('image', { length: 512 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// -----------------------------------------------------------------------------
// Password Reset Tokens / OTPs Table
// -----------------------------------------------------------------------------
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 255 }).notNull(), // hashed OTP
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
    expiresAtIdx: index('password_reset_tokens_expires_at_idx').on(table.expiresAt),
  })
);

// -----------------------------------------------------------------------------
// Categories Table
// -----------------------------------------------------------------------------
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    icon: varchar('icon', { length: 50 }).notNull().default('Tag'),
    color: varchar('color', { length: 20 }).notNull().default('#64748b'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('categories_user_id_idx').on(table.userId),
    typeIdx: index('categories_type_idx').on(table.type),
    userUniqueIdx: uniqueIndex('categories_user_name_type_unique_idx')
      .on(table.userId, sql`lower(${table.name})`, table.type)
      .where(sql`${table.userId} IS NOT NULL`),
    systemUniqueIdx: uniqueIndex('categories_system_name_type_unique_idx')
      .on(sql`lower(${table.name})`, table.type)
      .where(sql`${table.userId} IS NULL`),
  })
);

// -----------------------------------------------------------------------------
// Transactions Table
// -----------------------------------------------------------------------------
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    description: varchar('description', { length: 255 }).notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    transactionDate: date('transaction_date').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    amountCheck: check('transactions_amount_positive_check', sql`${table.amount} > 0`),
    userDateIdx: index('transactions_user_date_idx').on(table.userId, table.transactionDate.desc()),
    userTypeDateIdx: index('transactions_user_type_date_idx').on(
      table.userId,
      table.type,
      table.transactionDate.desc()
    ),
    userCategoryIdx: index('transactions_user_category_idx').on(table.userId, table.categoryId),
  })
);

// -----------------------------------------------------------------------------
// Drizzle Relations
// -----------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  transactions: many(transactions),
  passwordResetTokens: many(passwordResetTokens),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectTransaction = typeof transactions.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type SelectPasswordResetToken = typeof passwordResetTokens.$inferSelect;
