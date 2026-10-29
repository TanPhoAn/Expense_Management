import { z } from 'zod';

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid('ID danh mục không hợp lệ'),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Định dạng tháng phải là YYYY-MM (vd: 2026-10)'),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'number') return val;
      const cleaned = val.replace(/\./g, '').replace(/,/g, '.').trim();
      return Number(cleaned);
    })
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Hạn mức ngân sách phải lớn hơn 0 ₫',
    })
    .refine((val) => val <= 999_999_999_999, {
      message: 'Hạn mức ngân sách tối đa 999.999.999.999 ₫',
    }),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
