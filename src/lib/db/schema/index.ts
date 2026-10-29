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
    receiptUrl: varchar('receipt_url', { length: 512 }),
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
// Budgets Table
// -----------------------------------------------------------------------------
export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    month: varchar('month', { length: 7 }).notNull(), // format 'YYYY-MM'
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userCatMonthUniqueIdx: uniqueIndex('budgets_user_cat_month_unique_idx').on(
      table.userId,
      table.categoryId,
      table.month
    ),
    userMonthIdx: index('budgets_user_month_idx').on(table.userId, table.month),
    amountCheck: check('budgets_amount_positive_check', sql`${table.amount} > 0`),
  })
);

// -----------------------------------------------------------------------------
// Savings Goals Table
// -----------------------------------------------------------------------------
export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    targetAmount: numeric('target_amount', { precision: 15, scale: 2 }).notNull(),
    currentAmount: numeric('current_amount', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    targetDate: date('target_date'),
    color: varchar('color', { length: 30 }).notNull().default('#10b981'),
    icon: varchar('icon', { length: 50 }).notNull().default('PiggyBank'),
    isCompleted: boolean('is_completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    targetAmountCheck: check('savings_goals_target_positive_check', sql`${table.targetAmount} > 0`),
    currentAmountCheck: check('savings_goals_current_non_negative_check', sql`${table.currentAmount} >= 0`),
    userCompletedIdx: index('savings_goals_user_completed_idx').on(table.userId, table.isCompleted),
  })
);

// -----------------------------------------------------------------------------
// Savings Goal Logs Table
// -----------------------------------------------------------------------------
export const savingsGoalLogs = pgTable(
  'savings_goal_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => savingsGoals.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'DEPOSIT' | 'WITHDRAW'
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    note: varchar('note', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    amountCheck: check('savings_goal_logs_amount_positive_check', sql`${table.amount} > 0`),
    goalCreatedIdx: index('savings_goal_logs_goal_created_idx').on(table.goalId, table.createdAt.desc()),
    userIdIdx: index('savings_goal_logs_user_id_idx').on(table.userId),
  })
);

// -----------------------------------------------------------------------------
// Drizzle Relations
// -----------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  transactions: many(transactions),
  passwordResetTokens: many(passwordResetTokens),
  budgets: many(budgets),
  savingsGoals: many(savingsGoals),
  savingsGoalLogs: many(savingsGoalLogs),
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
  budgets: many(budgets),
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

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one, many }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
  logs: many(savingsGoalLogs),
}));

export const savingsGoalLogsRelations = relations(savingsGoalLogs, ({ one }) => ({
  goal: one(savingsGoals, {
    fields: [savingsGoalLogs.goalId],
    references: [savingsGoals.id],
  }),
  user: one(users, {
    fields: [savingsGoalLogs.userId],
    references: [users.id],
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
export type InsertBudget = typeof budgets.$inferInsert;
export type SelectBudget = typeof budgets.$inferSelect;
export type InsertSavingsGoal = typeof savingsGoals.$inferInsert;
export type SelectSavingsGoal = typeof savingsGoals.$inferSelect;
export type InsertSavingsGoalLog = typeof savingsGoalLogs.$inferInsert;
export type SelectSavingsGoalLog = typeof savingsGoalLogs.$inferSelect;
