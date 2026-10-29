import { z } from 'zod';

export const createSavingsGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên mục tiêu không được để trống')
    .max(150, 'Tên mục tiêu tối đa 150 ký tự'),
  targetAmount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'number') return val;
      const cleaned = val.replace(/\./g, '').replace(/,/g, '.').trim();
      return Number(cleaned);
    })
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Số tiền mục tiêu phải lớn hơn 0 ₫',
    })
    .refine((val) => val <= 999_999_999_999, {
      message: 'Số tiền mục tiêu tối đa 999.999.999.999 ₫',
    }),
  initialAmount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      const cleaned = val.replace(/\./g, '').replace(/,/g, '.').trim();
      return Number(cleaned);
    })
    .refine((val) => val === undefined || (!isNaN(val) && val >= 0), {
      message: 'Số tiền ban đầu không được âm',
    }),
  targetDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Ngày hoàn thành phải có định dạng YYYY-MM-DD',
    }),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Mã màu HEX không hợp lệ')
    .default('#10b981'),
  icon: z.string().min(1).default('PiggyBank'),
});

export const savingsGoalActionSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'number') return val;
      const cleaned = val.replace(/\./g, '').replace(/,/g, '.').trim();
      return Number(cleaned);
    })
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Số tiền phải lớn hơn 0 ₫',
    })
    .refine((val) => val <= 999_999_999_999, {
      message: 'Số tiền tối đa 999.999.999.999 ₫',
    }),
  type: z.enum(['DEPOSIT', 'WITHDRAW'], {
    errorMap: () => ({ message: 'Loại thao tác phải là DEPOSIT hoặc WITHDRAW' }),
  }),
  note: z.string().max(255, 'Ghi chú tối đa 255 ký tự').optional(),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type SavingsGoalActionInput = z.infer<typeof savingsGoalActionSchema>;
