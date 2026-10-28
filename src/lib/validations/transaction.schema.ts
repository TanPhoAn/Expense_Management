import { z } from 'zod';

export const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE'], {
  errorMap: () => ({ message: 'Loại giao dịch phải là INCOME hoặc EXPENSE' }),
});

export const createTransactionSchema = z.object({
  description: z
    .string()
    .min(1, 'Mô tả không được để trống')
    .max(255, 'Mô tả tối đa 255 ký tự')
    .trim(),
  amount: z
    .string()
    .min(1, 'Số tiền không được để trống')
    .regex(/^\d+(\.\d{1,2})?$/, 'Số tiền không hợp lệ')
    .refine((val) => parseFloat(val) > 0, 'Số tiền phải lớn hơn 0'),
  type: transactionTypeEnum,
  categoryId: z.string().uuid('Danh mục không hợp lệ'),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày giao dịch phải có định dạng YYYY-MM-DD'),
  note: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional().nullable(),
  receiptUrl: z.string().max(512, 'Đường dẫn ảnh tối đa 512 ký tự').optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(20),
  type: transactionTypeEnum.optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(100).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
