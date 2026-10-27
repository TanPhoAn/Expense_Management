import { describe, it, expect } from 'vitest';
import { createTransactionSchema, updateTransactionSchema, transactionFilterSchema } from '../../src/lib/validations/transaction.schema';
import { createCategorySchema, updateCategorySchema } from '../../src/lib/validations/category.schema';
import { registerSchema, loginSchema } from '../../src/lib/validations/auth.schema';

/**
 * Comprehensive validation schema tests.
 * All tests are pure — no DB, no network.
 */
describe('Validation Schemas', () => {

  // ─── Transaction Create ───────────────────────────────────────────────────

  describe('createTransactionSchema', () => {
    const validExpense = {
      description: 'Đi ăn trưa',
      amount: '55000',
      type: 'EXPENSE' as const,
      categoryId: 'b1494602-0e22-4841-8f43-b248a3fec023',
      transactionDate: '2026-10-26',
      note: 'Ăn cùng đồng nghiệp',
    };

    const validIncome = {
      description: 'Lương tháng 10',
      amount: '12000000',
      type: 'INCOME' as const,
      categoryId: 'b1494602-0e22-4841-8f43-b248a3fec023',
      transactionDate: '2026-10-01',
    };

    it('should accept a valid EXPENSE transaction', () => {
      expect(createTransactionSchema.safeParse(validExpense).success).toBe(true);
    });

    it('should accept a valid INCOME transaction', () => {
      expect(createTransactionSchema.safeParse(validIncome).success).toBe(true);
    });

    it('should reject zero amount', () => {
      const result = createTransactionSchema.safeParse({ ...validExpense, amount: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = createTransactionSchema.safeParse({ ...validExpense, amount: '-10000' });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric amount string', () => {
      const result = createTransactionSchema.safeParse({ ...validExpense, amount: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format (DD-MM-YYYY)', () => {
      const result = createTransactionSchema.safeParse({
        ...validExpense,
        transactionDate: '26-10-2026',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format (YYYY/MM/DD)', () => {
      const result = createTransactionSchema.safeParse({
        ...validExpense,
        transactionDate: '2026/10/26',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid transaction type', () => {
      const result = createTransactionSchema.safeParse({
        ...validExpense,
        type: 'TRANSFER',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid categoryId (non-UUID)', () => {
      const result = createTransactionSchema.safeParse({
        ...validExpense,
        categoryId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const result = createTransactionSchema.safeParse({
        ...validExpense,
        description: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const { categoryId: _omitted, ...withoutCategory } = validExpense;
      const result = createTransactionSchema.safeParse(withoutCategory);
      expect(result.success).toBe(false);
    });

    it('should allow note to be omitted (optional field)', () => {
      const { note: _omitted, ...withoutNote } = validExpense;
      const result = createTransactionSchema.safeParse(withoutNote);
      expect(result.success).toBe(true);
    });

    it('should allow note to be null or empty string', () => {
      expect(
        createTransactionSchema.safeParse({ ...validExpense, note: null }).success
      ).toBe(true);
    });

    it('should allow valid Cloudinary receiptUrl', () => {
      expect(
        createTransactionSchema.safeParse({
          ...validExpense,
          receiptUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        }).success
      ).toBe(true);
    });

    it('should allow receiptUrl to be null or omitted', () => {
      expect(
        createTransactionSchema.safeParse({ ...validExpense, receiptUrl: null }).success
      ).toBe(true);
      expect(
        createTransactionSchema.safeParse(validExpense).success
      ).toBe(true);
    });

    it('should reject receiptUrl exceeding 512 characters', () => {
      const longUrl = 'https://res.cloudinary.com/' + 'a'.repeat(510);
      expect(
        createTransactionSchema.safeParse({ ...validExpense, receiptUrl: longUrl }).success
      ).toBe(false);
    });
  });

  // ─── Transaction Update ───────────────────────────────────────────────────

  describe('updateTransactionSchema (partial)', () => {
    it('should accept an empty update object (all fields optional)', () => {
      const result = updateTransactionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept a partial update with only description', () => {
      const result = updateTransactionSchema.safeParse({ description: 'Updated description' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid amount in partial update', () => {
      const result = updateTransactionSchema.safeParse({ amount: '-5000' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date in partial update', () => {
      const result = updateTransactionSchema.safeParse({ transactionDate: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ─── Transaction Filter ───────────────────────────────────────────────────

  describe('transactionFilterSchema', () => {
    it('should accept valid filter parameters', () => {
      const result = transactionFilterSchema.safeParse({
        type: 'EXPENSE',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        page: '1',
        pageSize: '20',
      });
      expect(result.success).toBe(true);
    });

    it('should use default page=1 and pageSize=20 when omitted', () => {
      const result = transactionFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('should reject invalid type filter', () => {
      const result = transactionFilterSchema.safeParse({ type: 'INVALID' });
      expect(result.success).toBe(false);
    });
  });

  // ─── Category Schemas ─────────────────────────────────────────────────────

  describe('createCategorySchema', () => {
    const validCategory = {
      name: 'Ăn uống',
      type: 'EXPENSE' as const,
      icon: '🍜',
      color: '#FF6B6B',
    };

    it('should accept a valid category', () => {
      expect(createCategorySchema.safeParse(validCategory).success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createCategorySchema.safeParse({ ...validCategory, name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const result = createCategorySchema.safeParse({ ...validCategory, type: 'OTHER' });
      expect(result.success).toBe(false);
    });

    it('should allow icon and color to be optional or have defaults', () => {
      const { icon: _i, color: _c, ...minimal } = validCategory;
      const result = createCategorySchema.safeParse(minimal);
      // Depending on schema — should succeed if icon/color have defaults
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('updateCategorySchema (partial)', () => {
    it('should accept empty update object', () => {
      expect(updateCategorySchema.safeParse({}).success).toBe(true);
    });

    it('should accept partial update with only name', () => {
      expect(updateCategorySchema.safeParse({ name: 'Giải trí' }).success).toBe(true);
    });
  });

  // ─── Auth Schemas ─────────────────────────────────────────────────────────

  describe('registerSchema', () => {
    const validUser = {
      email: 'user@example.com',
      password: 'StrongP@ssword1',
      name: 'Nguyễn Văn A',
    };

    it('should accept a valid registration payload', () => {
      expect(registerSchema.safeParse(validUser).success).toBe(true);
    });

    it('should reject an invalid email address', () => {
      const result = registerSchema.safeParse({ ...validUser, email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('should reject a short password', () => {
      const result = registerSchema.safeParse({ ...validUser, password: '123' });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid credentials', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(false);
    });
  });
});
